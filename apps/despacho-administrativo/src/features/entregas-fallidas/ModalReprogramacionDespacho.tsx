import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Flex, Modal, Skeleton, Stack, Text, Textarea } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import 'dayjs/locale/es';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarDetalle, errorDetalle } from './apiDetalle';
import type { ContextoDecisionIncidencia, DetalleIncidencia } from './modeloDetalle';
import { diaLima, diaSiguiente, fechaCivilValida, longitudObservacionReprogramacion, normalizarObservacionReprogramacion,
  reprogramarDespacho, type OperacionReprogramacion, type ResultadoReprogramacion } from './apiReprogramacion';

type Fase = 'carga' | 'lista' | 'envio' | 'aceptada' | 'error' | 'conflicto' | 'desconocido' | 'repetible' | 'sinPermiso';
type ContextoReprogramacion = Pick<ContextoDecisionIncidencia, 'idDespacho' | 'idIncidencia' | 'versionDespacho'>;
export function ModalReprogramacionDespacho({ contexto, abierto, alCerrar, alActualizar, alCompletar, alRevocar, alRecuperarFoco, alResultadoDesconocido }: {
  contexto: ContextoReprogramacion | null; abierto: boolean; alCerrar: () => void; alActualizar: () => void;
  alCompletar: (resultado: ResultadoReprogramacion) => void; alRevocar: () => void; alRecuperarFoco: () => void;
  alResultadoDesconocido?: (pendiente: boolean) => void;
}) {
  const cliente = useClienteApi();
  const [detalle, establecerDetalle] = useState<DetalleIncidencia | null>(null);
  const [fase, establecerFase] = useState<Fase>('carga');
  const [fecha, establecerFecha] = useState<string | null>(null);
  const [observacion, establecerObservacion] = useState('');
  const [mensaje, establecerMensaje] = useState('');
  const [campos, establecerCampos] = useState<Record<string, string>>({});
  const original = useRef<OperacionReprogramacion | null>(null);
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
    establecerDetalle(null); establecerFecha(null); establecerObservacion(''); establecerFase('sinPermiso');
    establecerMensaje('Tu sesión no permite reprogramar este despacho. Recupera el acceso para continuar.');
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
          || actual.estado !== 'FALLIDO' || !actual.acciones.reprogramar.habilitada) {
        establecerFase('conflicto');
        const razones: Record<string, string> = {
          RECEPCION_PENDIENTE: 'Primero confirma la recepción del paquete.',
          PEDIDO_ANULADO: 'El pedido está anulado; solo corresponde cierre a origen.',
          MAXIMO_INTENTOS_ALCANZADO: 'Se alcanzó el máximo vigente de intentos.',
        };
        establecerMensaje(actual.acciones.reprogramar.motivosBloqueo.map((razon) => razones[razon]).filter(Boolean).join(' ')
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
      establecerMensaje('Hay una reprogramación cuyo resultado no se comprobó. Consulta antes de iniciar otra decisión.');
    } else {
      establecerDetalle(null); establecerFecha(null); establecerObservacion(''); establecerCampos({});
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
  const hoy = detalle ? diaLima(detalle.consultadoEn) : '';
  const longitud = longitudObservacionReprogramacion(observacion);
  const fechaValida = Boolean(fecha && fechaCivilValida(fecha) && fecha > hoy);
  const enviar = async (repeticion = false) => {
    if (ocupado.current || !repeticion && (!detalle || fase !== 'lista' || !fechaValida || longitud > 500)) return;
    const operacion = repeticion ? original.current : detalle && fecha ? { id: detalle.idDespacho, intentos: detalle.numeroIntentos, cuerpo: {
      idIncidencia: detalle.incidencia.idIncidencia, versionDespacho: detalle.versionDespacho,
      nuevaFechaProgramada: fecha, observacion: normalizarObservacionReprogramacion(observacion),
    } } : null;
    if (!operacion) return;
    original.current = operacion; ocupado.current = true;
    const numero = ++generacion.current;
    controlador.current = new AbortController();
    establecerFase('envio'); establecerMensaje(''); establecerCampos({});
    try {
      const resultado = await reprogramarDespacho(cliente, operacion, controlador.current.signal);
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
      if (estado === 400 || inconsistente || estado === 404 || estado === 409 || estado === 422) {
        original.current = null;
        callbacks.current.alResultadoDesconocido?.(false);
        establecerFase(estado === 400 || inconsistente ? 'lista' : 'conflicto');
        establecerMensaje(estado === 400 ? 'Revisa la fecha y la observación de reprogramación.'
          : inconsistente ? 'No se puede confirmar con estos datos. Solicita revisión de la información del despacho.'
          : estado === 404 ? 'El despacho ya no está disponible.'
          : estado === 422 ? 'Se alcanzó el máximo vigente de intentos. Actualiza el detalle para revisar el cierre.'
          : 'La información cambió. Actualiza y revisa antes de confirmar otra decisión.');
        if (estado === 400 && axios.isAxiosError(error) && Array.isArray(error.response?.data?.errores)) {
          establecerCampos(Object.fromEntries(error.response.data.errores.filter((dato: { campo?: unknown }) => typeof dato.campo === 'string')
            .map((dato: { campo: string }) => [dato.campo, dato.campo === 'nuevaFechaProgramada' ? 'Elige una fecha posterior a hoy en Lima.' : 'Revisa el valor indicado.'])));
        }
        if ([404, 409, 422].includes(estado ?? 0)) callbacks.current.alActualizar();
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
    title="Reprogramar despacho" size="md" centered trapFocus returnFocus={false}
    closeButtonProps={{ 'aria-label': 'Cerrar reprogramación' }} withCloseButton={!enviando}
    closeOnClickOutside={!enviando && fase !== 'carga'} closeOnEscape={!enviando}
    onExitTransitionEnd={() => {
      const foco = disparador.current;
      if (foco && foco !== document.body && foco.isConnected && !foco.matches(':disabled')) foco.focus();
      else alRecuperarFoco();
    }} styles={{ title: { fontWeight: 700 }, body: { overflowWrap: 'anywhere' } }}>
    <Stack gap="md" aria-busy={enviando || fase === 'carga'}>
      <Text tabIndex={-1} data-autofocus size="sm">Programa otra salida del mismo despacho sin consumir un intento.</Text>
      {fase === 'carga' && <><Skeleton height={80} /><Text role="status">Consultando información actual…</Text></>}
      {detalle && fase !== 'sinPermiso' && <Stack gap={4} p="sm" bg="var(--ia-color-surface-cloud)" style={{ borderRadius: 8 }}>
        <Text fw={700}>{detalle.codigoRastreoInterno}</Text>
        <Text size="sm"><strong>Motivo del fallo: </strong>{detalle.incidencia.motivo.etiqueta}</Text>
        <Text size="sm"><strong>Intentos consumidos: </strong>{detalle.numeroIntentos} de {detalle.maximoIntentos}</Text>
      </Stack>}
      {detalle && fase !== 'sinPermiso' && <fieldset disabled={!editable} style={{ border: 0, margin: 0, padding: 0 }}>
        <Stack gap="md">
          <DatePickerInput label="Nueva fecha programada" placeholder="Selecciona una fecha" locale="es" valueFormat="DD/MM/YYYY"
            value={fecha} onChange={establecerFecha} minDate={diaSiguiente(hoy)} maxDate="9999-12-31" defaultDate={diaSiguiente(hoy)}
            withAsterisk clearable clearButtonProps={{ 'aria-label': 'Limpiar nueva fecha' }} nextLabel="Mes siguiente" previousLabel="Mes anterior"
            popoverProps={{ withinPortal: false }} styles={{ input: { minHeight: 44 } }}
            description={'Elige una fecha posterior al ' + hoy.split('-').reverse().join('/') + ' · Hora de Lima.'}
            error={campos.nuevaFechaProgramada || fecha && !fechaValida && 'Elige una fecha posterior a hoy en Lima.'} />
          <Textarea label="Observación (opcional)" value={observacion} onChange={(evento) => establecerObservacion(evento.currentTarget.value)}
            description="Máximo 500 caracteres, sin contar espacios en los extremos." minRows={3} autosize
            error={longitud > 500 ? 'La observación supera los 500 caracteres.' : campos.observacion} />
          <Text size="xs" c={longitud > 500 ? 'red' : 'dimmed'}>{longitud} / 500 caracteres</Text>
        </Stack>
      </fieldset>}
      {detalle && fase !== 'sinPermiso' && <Text size="sm" c="dimmed">
        Volverá inmediatamente a Programación. Podrá asignarse desde la fecha elegida, cuando la reserva anterior esté liberada.
        Se conserva el contador de intentos y el historial.
      </Text>}
      {mensaje && <Alert color={fase === 'repetible' ? 'blue' : 'orange'} role="alert">{mensaje}</Alert>}
      {enviando && <Text role="status">{fase === 'aceptada' ? 'Reprogramación registrada. Actualizando información…' : 'Registrando reprogramación…'}</Text>}
      {fase === 'error' && <Button variant="outline" onClick={() => void leer(false)}>Reintentar consulta</Button>}
      {fase === 'conflicto' && <Button variant="outline" onClick={() => { alCerrar(); alActualizar(); }}>Cerrar y revisar detalle</Button>}
      {fase === 'desconocido' && <Button variant="outline" onClick={() => void leer(true)}>Consultar resultado</Button>}
      {fase === 'repetible' && <Button onClick={() => void enviar(true)}>Repetir solicitud original</Button>}
      <Flex justify="flex-end" gap="sm" direction={{ base: 'column', xs: 'row' }}>
        <Button variant="default" disabled={enviando} onClick={alCerrar}>Cancelar</Button>
        <Button disabled={!editable || !fechaValida || longitud > 500} loading={enviando} onClick={() => void enviar()}>Confirmar reprogramación</Button>
      </Flex>
    </Stack>
  </Modal>;
}
