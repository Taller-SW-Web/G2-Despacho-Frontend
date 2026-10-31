import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Flex, Modal, Skeleton, Stack, Text, Textarea } from '@mantine/core';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarDetalle, errorDetalle } from './apiDetalle';
import type { ContextoDecisionIncidencia, DetalleIncidencia } from './modeloDetalle';
import { longitudTextoCierre, normalizarTextoCierre, cerrarDespacho, type OperacionCierre, type ResultadoCierre } from './apiCierre';

type Fase = 'carga' | 'lista' | 'envio' | 'aceptada' | 'error' | 'conflicto' | 'desconocido' | 'repetible' | 'sinPermiso';
type ContextoCierre = Pick<ContextoDecisionIncidencia, 'idDespacho' | 'idIncidencia' | 'versionDespacho'>;
export function ModalCierreDespacho({ contexto, abierto, alCerrar, alActualizar, alCompletar, alRevocar, alRecuperarFoco, alResultadoDesconocido }: {
  contexto: ContextoCierre | null; abierto: boolean; alCerrar: () => void; alActualizar: () => void;
  alCompletar: (resultado: ResultadoCierre) => void; alRevocar: () => void; alRecuperarFoco: () => void;
  alResultadoDesconocido?: (pendiente: boolean) => void;
}) {
  const cliente = useClienteApi();
  const [detalle, establecerDetalle] = useState<DetalleIncidencia | null>(null);
  const [fase, establecerFase] = useState<Fase>('carga');
  const [motivo, establecerMotivo] = useState('');
  const [observacion, establecerObservacion] = useState('');
  const [mensaje, establecerMensaje] = useState('');
  const [campos, establecerCampos] = useState<Record<string, string>>({});
  const original = useRef<OperacionCierre | null>(null);
  const disparador = useRef<HTMLElement | null>(null);
  const ocupado = useRef(false);
  const generacion = useRef(0);
  const controlador = useRef<AbortController | null>(null);
  const callbacks = useRef({ alCerrar, alActualizar, alCompletar, alRevocar, alResultadoDesconocido });
  callbacks.current = { alCerrar, alActualizar, alCompletar, alRevocar, alResultadoDesconocido };
  useEffect(() => {
    if (abierto) disparador.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [abierto]);
  const revocar = () => {
    generacion.current++; controlador.current?.abort(); ocupado.current = false; original.current = null;
    callbacks.current.alResultadoDesconocido?.(false);
    establecerDetalle(null); establecerMotivo(''); establecerObservacion(''); establecerFase('sinPermiso');
    establecerMensaje('Tu sesión no permite cerrar este despacho. Recupera el acceso para continuar.');
    callbacks.current.alRevocar();
  };
  const leer = async (recuperacion: boolean) => {
    const id = recuperacion ? original.current?.id : contexto?.idDespacho;
    if (!id || ocupado.current) return;
    ocupado.current = true;
    const numero = ++generacion.current;
    controlador.current = new AbortController();
    establecerFase('carga'); establecerMensaje('');
    try {
      const actual = await consultarDetalle(cliente, id, controlador.current.signal);
      if (numero !== generacion.current) return;
      if (recuperacion && original.current) {
        // El GET no acredita el ejecutor ni la respuesta de una operación anterior.
        establecerFase('repetible');
        establecerMensaje('Consulta realizada. Recupera la confirmación repitiendo exactamente la solicitud original. Los datos de otra salida no sustituyen esa solicitud.');
        return;
      }
      establecerDetalle(actual);
      if (actual.incidencia.idIncidencia !== contexto?.idIncidencia || actual.versionDespacho !== contexto?.versionDespacho
          || actual.estado !== 'FALLIDO' || !actual.acciones.cerrarComoDevueltoAOrigen.habilitada) {
        establecerFase('conflicto');
        const razones: Record<string, string> = {
          RECEPCION_PENDIENTE: 'Primero confirma la recepción del paquete.',
        };
        establecerMensaje(actual.acciones.cerrarComoDevueltoAOrigen.motivosBloqueo.map((razon) => razones[razon]).filter(Boolean).join(' ')
          || 'La información cambió. Cierra y revisa el detalle actualizado antes de decidir.');
        callbacks.current.alActualizar();
      } else establecerFase('lista');
    } catch (error) {
      if (numero !== generacion.current) return;
      if (errorDetalle(error).sinPermiso) { revocar(); return; }
      establecerFase(recuperacion ? 'desconocido' : 'error');
      establecerMensaje(errorDetalle(error).noEncontrado ? 'El despacho ya no está disponible.'
        : recuperacion ? 'No pudimos comprobar el resultado. Consulta antes de repetir la solicitud original.'
          : 'No se pudo obtener el contexto actual. Reintenta la consulta.');
    } finally { if (numero === generacion.current) ocupado.current = false; }
  };
  useEffect(() => {
    if (!abierto || !contexto) return;
    if (original.current) {
      establecerFase('desconocido');
      establecerMensaje('Hay un cierre cuyo resultado no se comprobó. Consulta antes de iniciar otra decisión.');
    } else {
      establecerDetalle(null); establecerMotivo(''); establecerObservacion(''); establecerCampos({});
      void leer(false);
    }
    return () => { generacion.current++; controlador.current?.abort(); ocupado.current = false; };
    // La apertura fija el recurso; los refrescos del padre no sustituyen una operación enviada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, contexto?.idDespacho, contexto?.idIncidencia, contexto?.versionDespacho, cliente]);
  useEffect(() => {
    const sesion = (evento: Event) => {
      if (evento instanceof StorageEvent && evento.key && !['despacho.token', 'despacho.sesionCerrada'].includes(evento.key)) return;
      revocar();
    };
    window.addEventListener('despacho:sesion', sesion); window.addEventListener('storage', sesion);
    return () => { window.removeEventListener('despacho:sesion', sesion); window.removeEventListener('storage', sesion); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const longitud = longitudTextoCierre(observacion);
  const longitudMotivo = longitudTextoCierre(motivo);
  const motivoValido = longitudMotivo > 0 && longitudMotivo <= 500;
  const enviar = async (repeticion = false) => {
    if (ocupado.current || !repeticion && (!detalle || fase !== 'lista' || !motivoValido || longitud > 500)) return;
    const operacion = repeticion ? original.current : detalle && motivoValido ? { id: detalle.idDespacho, intentos: detalle.numeroIntentos, cuerpo: {
      idIncidencia: detalle.incidencia.idIncidencia, versionDespacho: detalle.versionDespacho,
      motivo: normalizarTextoCierre(motivo)!, observacion: normalizarTextoCierre(observacion),
    } } : null;
    if (!operacion) return;
    original.current = operacion; ocupado.current = true;
    const numero = ++generacion.current;
    controlador.current = new AbortController();
    establecerFase('envio'); establecerMensaje(''); establecerCampos({});
    try {
      const resultado = await cerrarDespacho(cliente, operacion, controlador.current.signal);
      if (numero !== generacion.current) return;
      original.current = null; establecerFase('aceptada');
      callbacks.current.alResultadoDesconocido?.(false);
      // El resultado original no acredita el estado presente. Un fallo de lectura no revierte la aceptación.
      try { await consultarDetalle(cliente, operacion.id, controlador.current.signal); }
      catch (error) {
        if (numero !== generacion.current) return;
        if (errorDetalle(error).sinPermiso) { revocar(); return; }
      }
      if (numero === generacion.current) callbacks.current.alCompletar(resultado);
    } catch (error) {
      if (numero !== generacion.current) return;
      const estado = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (estado === 401 || estado === 403) { revocar(); return; }
      const inconsistente = estado === 500 && errorDetalle(error).inconsistente;
      if (estado === 400 || inconsistente || estado === 404 || estado === 409) {
        original.current = null;
        callbacks.current.alResultadoDesconocido?.(false);
        establecerFase(estado === 400 || inconsistente ? 'lista' : 'conflicto');
        establecerMensaje(estado === 400 ? 'Revisa el motivo y la observación del cierre.'
          : inconsistente ? 'No se puede confirmar con estos datos. Solicita revisión de la información del despacho.'
          : estado === 404 ? 'El despacho ya no está disponible.'
          : 'La información cambió. Actualiza y revisa antes de confirmar otra decisión.');
        if (estado === 400 && axios.isAxiosError(error) && Array.isArray(error.response?.data?.errores)) {
          establecerCampos(Object.fromEntries(error.response.data.errores.filter((dato: { campo?: unknown }) => typeof dato.campo === 'string')
            .map((dato: { campo: string }) => [dato.campo, dato.campo === 'motivo' ? 'Indica un motivo de 1 a 500 caracteres.' : 'Revisa el valor indicado.'])));
        }
        if ([404, 409].includes(estado ?? 0)) callbacks.current.alActualizar();
      } else {
        callbacks.current.alResultadoDesconocido?.(true);
        establecerFase('desconocido');
        establecerMensaje('No pudimos comprobar el resultado. Consulta antes de repetir la solicitud original.');
      }
    } finally { if (numero === generacion.current) ocupado.current = false; }
  };
  const enviando = fase === 'envio' || fase === 'aceptada';
  const editable = fase === 'lista';
  return <Modal opened={abierto} onClose={() => { if (!enviando) alCerrar(); }}
    title="Cerrar como devuelto a origen" size={480} centered trapFocus returnFocus={false}
    closeButtonProps={{ 'aria-label': 'Cerrar formulario de cierre' }} withCloseButton={!enviando}
    closeOnClickOutside={!enviando && fase !== 'carga'} closeOnEscape={!enviando}
    onExitTransitionEnd={() => {
      const foco = disparador.current;
      if (foco && foco !== document.body && foco.isConnected && !foco.matches(':disabled')) foco.focus();
      else alRecuperarFoco();
    }} styles={{ title: { fontWeight: 700 }, body: { overflowWrap: 'anywhere' } }}>
    <Stack gap="md" aria-busy={enviando || fase === 'carga'}>
      <Text tabIndex={-1} data-autofocus size="sm">Confirma el fin logístico de este despacho.</Text>
      {fase === 'carga' && <><Skeleton height={80} /><Text role="status">Consultando información actual…</Text></>}
      {detalle && fase !== 'sinPermiso' && <Stack gap={4} p="sm" bg="var(--ia-color-surface-cloud)" style={{ borderRadius: 8 }}>
        <Text fw={700}>{detalle.codigoRastreoInterno}</Text>
        <Text size="sm"><strong>Motivo del fallo: </strong>{detalle.incidencia.motivo.etiqueta}</Text>
        <Text size="sm"><strong>Intentos consumidos: </strong>{detalle.numeroIntentos} de {detalle.maximoIntentos}</Text>
      </Stack>}
      {detalle && fase !== 'sinPermiso' && <Alert color="yellow" title="Cierre definitivo">
        No habrá más entregas. El paquete quedará en el centro a disposición de Ventas y Postventa.
      </Alert>}
      {detalle && fase !== 'sinPermiso' && <fieldset disabled={!editable} style={{ border: 0, margin: 0, padding: 0 }}>
        <Stack gap="md">
          <Textarea label="Motivo del cierre" withAsterisk value={motivo} onChange={(evento) => establecerMotivo(evento.currentTarget.value)}
            description="Texto libre. Máximo 500 caracteres, sin contar espacios en los extremos." minRows={3} autosize
            error={longitudMotivo === 0 ? 'Indica el motivo del cierre.' : longitudMotivo > 500 ? 'El motivo supera los 500 caracteres.' : campos.motivo} />
          <Text size="xs" c={longitudMotivo > 500 ? 'red' : 'dimmed'}>{longitudMotivo} / 500 caracteres</Text>
          <Textarea label="Observación (opcional)" value={observacion} onChange={(evento) => establecerObservacion(evento.currentTarget.value)}
            description="Máximo 500 caracteres, sin contar espacios en los extremos." minRows={3} autosize
            error={longitud > 500 ? 'La observación supera los 500 caracteres.' : campos.observacion} />
          <Text size="xs" c={longitud > 500 ? 'red' : 'dimmed'}>{longitud} / 500 caracteres</Text>
        </Stack>
      </fieldset>}
      {mensaje && <Alert color={fase === 'repetible' ? 'blue' : 'orange'} role="alert">{mensaje}</Alert>}
      {enviando && <Text role="status">{fase === 'aceptada' ? 'Cierre registrado. Actualizando información…' : 'Registrando cierre…'}</Text>}
      {fase === 'error' && <Button variant="outline" onClick={() => void leer(false)}>Reintentar consulta</Button>}
      {fase === 'conflicto' && <Button variant="outline" onClick={() => { alCerrar(); alActualizar(); }}>Cerrar y revisar detalle</Button>}
      {fase === 'desconocido' && <Button variant="outline" onClick={() => void leer(true)}>Consultar resultado</Button>}
      {fase === 'repetible' && <Button onClick={() => void enviar(true)}>Repetir solicitud original</Button>}
      <Flex justify="flex-end" gap="sm" direction={{ base: 'column', xs: 'row' }}>
        <Button variant="default" disabled={enviando} onClick={alCerrar}>Cancelar</Button>
        <Button color="red" disabled={!editable || !motivoValido || longitud > 500} loading={enviando} onClick={() => void enviar()}>Cerrar despacho</Button>
      </Flex>
    </Stack>
  </Modal>;
}
