import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Flex, Group, Modal, Radio, Skeleton, Stack, Text, Textarea } from '@mantine/core';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarDetalle, errorDetalle } from './apiDetalle';
import { confirmarRecepcion, longitudObservacion, normalizarObservacion, type SolicitudRecepcion } from './apiRecepcion';
import type { DetalleIncidencia } from './modeloDetalle';
import { formatoFechaLima } from './modelo';

export type ContextoRecepcion = { idDespacho: string; idIncidencia: string };
type Fase = 'carga' | 'lista' | 'envio' | 'error' | 'conflicto' | 'desconocido' | 'repetible' | 'sinPermiso';
export function ModalRecepcionPaquete({ contexto, abierto, alCerrar, alActualizar, alAvisar, alRevocar, alRecuperarFoco }: {
  contexto: ContextoRecepcion | null; abierto: boolean; alCerrar: () => void; alActualizar: () => void;
  alAvisar: (mensaje: string) => void; alRevocar: () => void; alRecuperarFoco?: () => void;
}) {
  const cliente = useClienteApi();
  const [detalle, establecerDetalle] = useState<DetalleIncidencia | null>(null);
  const [fase, establecerFase] = useState<Fase>('carga');
  const [sello, establecerSello] = useState('');
  const [observacion, establecerObservacion] = useState('');
  const [mensaje, establecerMensaje] = useState('');
  const [campos, establecerCampos] = useState<Record<string, string>>({});
  const original = useRef<{ id: string; cuerpo: SolicitudRecepcion } | null>(null);
  const disparador = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (abierto) disparador.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [abierto]);
  const ocupado = useRef(false);
  const generacion = useRef(0);
  const controlador = useRef<AbortController | null>(null);
  const callbacks = useRef({ alCerrar, alActualizar, alAvisar, alRevocar });
  callbacks.current = { alCerrar, alActualizar, alAvisar, alRevocar };

  const revocar = () => {
    generacion.current++; controlador.current?.abort(); ocupado.current = false; original.current = null;
    establecerDetalle(null); establecerSello(''); establecerObservacion(''); establecerFase('sinPermiso');
    establecerMensaje('Tu sesión no permite confirmar esta recepción. Recupera el acceso para continuar.');
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
        // Una salida diferente no permite inferir el resultado de la recepción original.
        if (actual.incidencia.idIncidencia === original.current.cuerpo.idIncidencia
            && actual.incidencia.recepcion.estado === 'RECIBIDO_EN_CENTRO') {
          original.current = null;
          callbacks.current.alAvisar('El paquete ya figura recibido en centro. Consulta el detalle para revisar la liberación de capacidad.');
          callbacks.current.alCerrar(); callbacks.current.alActualizar(); return;
        }
        establecerFase('repetible');
        establecerMensaje('Consulta realizada. Puedes recuperar la operación repitiendo exactamente la solicitud original, sin modificar sus datos.');
        return;
      }
      establecerDetalle(actual);
      if (actual.incidencia.idIncidencia !== contexto?.idIncidencia || !actual.acciones.confirmarRecepcion.habilitada || actual.estado !== 'FALLIDO') {
        establecerFase('conflicto');
        establecerMensaje('La información cambió o la recepción ya fue confirmada. Cierra y revisa la pantalla actualizada.');
        callbacks.current.alActualizar();
      } else establecerFase('lista');
    } catch (error) {
      if (numero !== generacion.current) return;
      if (errorDetalle(error).sinPermiso) { revocar(); return; }
      establecerFase(recuperacion ? 'desconocido' : 'error');
      establecerMensaje(errorDetalle(error).noEncontrado ? 'El despacho ya no está disponible.'
        : recuperacion ? 'No pudimos comprobar el resultado. Consulta antes de volver a confirmar.' : 'No se pudo obtener el contexto actual. Reintenta la consulta.');
    } finally { if (numero === generacion.current) ocupado.current = false; }
  };
  useEffect(() => {
    if (!abierto || !contexto) return;
    if (original.current) {
      establecerFase('desconocido');
      establecerMensaje('Hay una recepción cuyo resultado no se comprobó. Consulta su resultado antes de iniciar otra.');
    } else {
      establecerDetalle(null); establecerSello(''); establecerObservacion(''); establecerCampos({});
      void leer(false);
    }
    return () => { generacion.current++; controlador.current?.abort(); ocupado.current = false; };
    // La apertura fija el recurso; refrescar el padre no reemplaza la solicitud enviada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, contexto?.idDespacho, contexto?.idIncidencia, cliente]);
  useEffect(() => {
    const sesion = (evento: Event) => {
      if (evento instanceof StorageEvent && evento.key && !['despacho.token', 'despacho.sesionCerrada'].includes(evento.key)) return;
      revocar();
    };
    window.addEventListener('despacho:sesion', sesion); window.addEventListener('storage', sesion);
    return () => { window.removeEventListener('despacho:sesion', sesion); window.removeEventListener('storage', sesion); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enviar = async (repeticion = false) => {
    if (ocupado.current) return;
    if (!repeticion && (!detalle || fase !== 'lista' || !sello || longitudObservacion(observacion) > 500)) return;
    const operacion = repeticion ? original.current : detalle ? { id: detalle.idDespacho, cuerpo: {
      idIncidencia: detalle.incidencia.idIncidencia, versionDespacho: detalle.versionDespacho,
      selloIntacto: sello === 'si', observacion: normalizarObservacion(observacion),
    } } : null;
    if (!operacion) return;
    original.current = operacion; ocupado.current = true;
    const numero = ++generacion.current;
    controlador.current = new AbortController();
    establecerFase('envio'); establecerMensaje(''); establecerCampos({});
    try {
      await confirmarRecepcion(cliente, operacion.id, operacion.cuerpo, controlador.current.signal);
      if (numero !== generacion.current) return;
      original.current = null;
      callbacks.current.alAvisar('Paquete recibido. Liberación de capacidad pendiente.');
      callbacks.current.alCerrar(); callbacks.current.alActualizar();
    } catch (error) {
      if (numero !== generacion.current) return;
      const estado = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (estado === 401 || estado === 403) { revocar(); return; }
      const inconsistente = estado === 500 && axios.isAxiosError(error) && error.response?.data?.code === 'DESP_ERROR_DATOS_INCONSISTENTES';
      if (estado === 400 || inconsistente || estado === 404 || estado === 409) {
        original.current = null;
        establecerFase(estado === 400 || estado === 500 ? 'lista' : 'conflicto');
        establecerMensaje(estado === 400 ? 'Revisa los datos de recepción.' : estado === 500
          ? 'No se puede registrar la recepción con estos datos. Solicita revisión.' : estado === 404
          ? 'El despacho ya no está disponible.' : 'La información cambió. Actualiza y revisa antes de confirmar.');
        if (estado === 400 && axios.isAxiosError(error) && Array.isArray(error.response?.data?.errores)) {
          establecerCampos(Object.fromEntries(error.response.data.errores
            .filter((dato: { campo?: unknown }) => typeof dato.campo === 'string')
            .map((dato: { campo: string }) => [dato.campo, 'Revisa el valor indicado.'])));
        }
        if (estado === 404 || estado === 409) callbacks.current.alActualizar();
      } else {
        establecerFase('desconocido');
        establecerMensaje('No pudimos comprobar el resultado. Consulta antes de volver a confirmar.');
      }
    } finally { if (numero === generacion.current) ocupado.current = false; }
  };
  const enCurso = fase === 'envio' || fase === 'carga';
  const editable = fase === 'lista';
  return <Modal opened={abierto} onClose={() => { if (fase !== 'envio') alCerrar(); }}
    title="Confirmar recepción del paquete" size="md" centered trapFocus returnFocus={false}
    closeButtonProps={{ 'aria-label': 'Cerrar recepción' }} onExitTransitionEnd={() => {
      const foco = disparador.current;
      if (foco && foco !== document.body && foco.isConnected && !foco.matches(':disabled')) foco.focus();
      else alRecuperarFoco?.();
    }} closeOnClickOutside={!enCurso} closeOnEscape={fase !== 'envio'}
    withCloseButton={fase !== 'envio'} styles={{ title: { fontWeight: 700 }, body: { overflowWrap: 'anywhere' } }}>
    <Stack gap="md" aria-busy={enCurso}>
      <Text tabIndex={-1} data-autofocus size="sm">Verifica que el paquete se encuentra físicamente en el centro de despacho.</Text>
      {fase === 'carga' && <><Skeleton height={70} /><Text role="status">Consultando información actual…</Text></>}
      {detalle && fase !== 'sinPermiso' && <Stack gap={4} p="sm" bg="var(--ia-color-surface-cloud)" style={{ borderRadius: 8 }}>
        <Text fw={700}>{detalle.codigoRastreoInterno}</Text>
        <Text size="sm"><strong>Motivo: </strong>{detalle.incidencia.motivo.etiqueta}</Text>
        <Text size="sm"><strong>Repartidor: </strong>{detalle.incidencia.repartidor.nombre ?? detalle.incidencia.repartidor.idRepartidor}</Text>
        <Text size="sm"><strong>Incidencia: </strong>{formatoFechaLima.format(new Date(detalle.incidencia.fechaIncidencia))} · Hora de Lima</Text>
      </Stack>}
      {detalle && fase !== 'sinPermiso' && <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: 0 }}>
        <Stack gap="md">
          <Radio.Group label="¿El sello está intacto?" value={sello} onChange={establecerSello} error={campos.selloIntacto}>
            <Group mt="xs"><Radio value="si" label="Sí" /><Radio value="no" label="No" /></Group>
          </Radio.Group>
          <Textarea label="Observación (opcional)" value={observacion} onChange={(evento) => establecerObservacion(evento.currentTarget.value)}
            description={sello === 'no' ? 'Puedes describir el estado del paquete; no es obligatorio.' : 'Máximo 500 caracteres, sin contar espacios en los extremos.'}
            error={longitudObservacion(observacion) > 500 ? 'La observación supera los 500 caracteres.' : campos.observacion} minRows={3} autosize />
          <Text size="xs" c={longitudObservacion(observacion) > 500 ? 'red' : 'dimmed'}>{longitudObservacion(observacion)} / 500 caracteres</Text>
        </Stack>
      </fieldset>}
      {mensaje && <Alert color={fase === 'repetible' ? 'blue' : 'orange'} role="alert">{mensaje}</Alert>}
      {fase === 'envio' && <Text role="status">Registrando el retorno del paquete…</Text>}
      {fase === 'error' && <Button variant="outline" onClick={() => void leer(false)}>Reintentar consulta</Button>}
      {fase === 'conflicto' && <Button variant="outline" onClick={alActualizar}>Actualizar vista</Button>}
      {fase === 'desconocido' && <Button variant="outline" onClick={() => void leer(true)}>Consultar resultado</Button>}
      {fase === 'repetible' && <Button onClick={() => void enviar(true)}>Repetir solicitud original</Button>}
      <Flex justify="flex-end" gap="sm" direction={{ base: 'column', xs: 'row' }}>
        <Button variant="default" disabled={fase === 'envio'} onClick={alCerrar}>Cancelar</Button>
        <Button disabled={!editable || !sello || longitudObservacion(observacion) > 500} loading={fase === 'envio'}
          onClick={() => void enviar()}>Confirmar recepción</Button>
      </Flex>
    </Stack>
  </Modal>;
}
