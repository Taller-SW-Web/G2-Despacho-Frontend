import { useEffect, useRef, useState } from 'react';
import { Anchor, Alert, Breadcrumbs, Button, Card, Grid, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BadgeEstado, EncabezadoPagina, EstadoVista, FranjaEstado, HistorialEstados, VisorEvidencia } from '@despacho/componentes-compartidos';
import { IconArrowLeft, IconCamera, IconInfoCircle, IconRefresh, IconZoomIn } from '@tabler/icons-react';
import { formatoFechaLima, leerFiltros } from './modelo';
import { adaptarHistorial, type DestinosDetalleIncidencia, type DetalleIncidencia } from './modeloDetalle';
import { PanelDecisionIncidencia } from './PanelDecisionIncidencia';
import { useDetalleIncidencia } from './useDetalleIncidencia';
import { useEvidenciaIncidencia } from './useEvidenciaIncidencia';
import clases from './DetalleIncidencia.module.css';
import { ModalRecepcionPaquete, type ContextoRecepcion } from './ModalRecepcionPaquete';
import { ModalReprogramacionDespacho } from './ModalReprogramacionDespacho';
import { ModalCierreDespacho } from './ModalCierreDespacho';
import type { ContextoDecisionIncidencia } from './modeloDetalle';

function Fecha({ valor }: { valor: string }) {
  return <Text component="time" dateTime={valor}>{formatoFechaLima.format(new Date(valor))}</Text>;
}
function Dato({ etiqueta, valor, completo = false }: { etiqueta: string; valor: React.ReactNode; completo?: boolean }) {
  return <div className={`${clases.dato} ${completo ? clases.datoCompleto : ''}`}><Text component="dt" size="sm" fw={600}>{etiqueta}</Text>
    <dd>{typeof valor === 'string' ? <Text>{valor}</Text> : valor}</dd></div>;
}
function EvidenciaIncidencia({ detalle, alRevocar }: { detalle: DetalleIncidencia; alRevocar: () => void }) {
  const incidencia = detalle.incidencia;
  const visor = useEvidenciaIncidencia(detalle.idDespacho, incidencia.idIncidencia, incidencia.evidencia.idEvidencia, alRevocar);
  const [ampliada, establecerAmpliada] = useState(false);
  const ausencia = incidencia.evidencia.estadoReferencia === 'SIN_EVIDENCIA' ? 'No intentado — sin foto' : 'Falta la referencia de evidencia';
  const propiedades = visor.estado === 'lista' && visor.url ? { estado: 'lista' as const, urlAutorizada: visor.url }
    : { estado: visor.estado === 'lista' ? 'error' as const : visor.estado, urlAutorizada: null };
  return <Card component="section" aria-labelledby="titulo-evidencia"><Stack gap="md">
    <Title order={2} size="h4" className={clases.tituloSeccion} id="titulo-evidencia">Evidencia de la incidencia</Title>
    {incidencia.evidencia.idEvidencia ? <>
      <Text size="sm" c="dimmed">Fotografía correspondiente a esta salida.</Text>
      {!visor.abierto && <div className={clases.sinFotografia}><IconCamera size={32} aria-hidden="true" />
        <Text size="sm">Carga la fotografía para revisar la evidencia.</Text></div>}
      <Button type="button" variant="subtle" leftSection={visor.abierto ? <IconZoomIn size={18} aria-hidden="true" /> : <IconCamera size={18} aria-hidden="true" />}
        disabled={visor.abierto && visor.estado !== 'lista'} onClick={() => {
          if (visor.abierto) establecerAmpliada(true);
          else void visor.abrir();
        }}>{visor.abierto ? 'Ampliar fotografía' : 'Ver fotografía'}</Button>
    </> : <div className={clases.sinFotografia}><IconCamera size={32} aria-hidden="true" />
      <Text fw={600}>{ausencia}</Text>
      <Text size="sm" c="dimmed">{incidencia.evidencia.estadoReferencia === 'SIN_EVIDENCIA'
        ? 'Esta salida no generó evidencia fotográfica.' : 'La fotografía de esta incidencia no está disponible.'}</Text></div>}
    <VisorEvidencia {...propiedades} abierto={visor.abierto && ampliada} vistaPrevia={visor.abierto && !ampliada}
      descripcion={`Evidencia de la incidencia del despacho ${detalle.codigoRastreoInterno}`}
      mensajeSinEvidencia={ausencia} alCerrar={() => { establecerAmpliada(false); visor.cerrar(); }}
      alSolicitarAcceso={() => void visor.abrir()} alFallarImagen={visor.fallarImagen} />
  </Stack></Card>;
}
function InformacionIncidencia({ detalle }: { detalle: DetalleIncidencia }) {
  const incidencia = detalle.incidencia;
  const recepcion = incidencia.recepcion;
  const liberacion = recepcion.liberacionCapacidad;
  return <>
    <Card component="section" aria-labelledby="titulo-incidencia"><Stack gap="sm">
      <Title order={2} size="h4" className={clases.tituloSeccion} id="titulo-incidencia">Última incidencia</Title>
      <dl className={clases.datos}>
        <Dato etiqueta="Motivo" valor={incidencia.motivo.etiqueta} />
        <Dato etiqueta="Intentos consumidos" valor={`${detalle.numeroIntentos} de ${detalle.maximoIntentos}`} />
        <Dato etiqueta="Fecha de incidencia" valor={<Fecha valor={incidencia.fechaIncidencia} />} />
        <Dato etiqueta="Repartidor" valor={<Stack gap={4}><Text>{incidencia.repartidor.nombre ?? 'Nombre del repartidor no disponible'}</Text>
          {!incidencia.repartidor.nombre && <Text size="sm" c="dimmed">ID: {incidencia.repartidor.idRepartidor}</Text>}</Stack>} />
        <Dato completo etiqueta="Comentario" valor={incidencia.comentario?.trim() || 'Sin comentario'} />
      </dl>
      {incidencia.motivo.codigo === 'NO_INTENTADO' && <Alert color="blue" title="No intentado en esta salida">Esta salida no consumió intento; se conserva el contador acumulado.</Alert>}
      <details className={clases.referencias}><summary>Repartidor y jornada de esta salida</summary>
        <dl className={clases.datos}>
          <Dato etiqueta="ID del repartidor" valor={incidencia.repartidor.idRepartidor} />
          <Dato etiqueta="ID de la jornada" valor={incidencia.jornada.idJornada} />
          <Dato etiqueta="Estado de la jornada" valor={incidencia.jornada.estado === 'DESCONOCIDA' ? 'Estado desconocido' : incidencia.jornada.estado === 'CERRADA' ? 'Cerrada' : 'Activa'} />
          {incidencia.jornada.cerradaEn && <Dato etiqueta="Cierre de jornada" valor={<Fecha valor={incidencia.jornada.cerradaEn} />} />}
        </dl>
      </details>
      {incidencia.retornoAtrasado === true && <Alert color="red">Retorno atrasado: la jornada cerró y el paquete sigue pendiente de retorno.</Alert>}
      {(incidencia.repartidor.nombre === null || incidencia.jornada.estado === 'DESCONOCIDA') && <Alert color="yellow" title="Información operativa no disponible">
        Se conservan los datos de la incidencia. {incidencia.jornada.estado === 'DESCONOCIDA' && 'No se pudo confirmar el cierre de esta jornada.'}
      </Alert>}
    </Stack></Card>
    <Card component="section" aria-labelledby="titulo-recepcion"><Stack gap="sm">
      <Group justify="space-between"><Title order={2} size="h4" className={clases.tituloSeccion} id="titulo-recepcion">Recepción en centro</Title>
        <BadgeEstado contexto="recepcion" valor={recepcion.estado} /></Group>
      {recepcion.estado === 'PENDIENTE_RETORNO' && <Text size="sm" c="dimmed">El paquete aún debe regresar al centro de despacho.</Text>}
      {recepcion.estado === 'RECIBIDO_EN_CENTRO' && <>
        <dl className={clases.datos}>
        <Dato etiqueta="Recepción confirmada" valor={recepcion.confirmadaEn && <Fecha valor={recepcion.confirmadaEn} />} />
        <Dato etiqueta="Usuario que confirmó" valor={recepcion.idUsuario} />
        <Dato etiqueta="Sello intacto" valor={recepcion.selloIntacto ? 'Sí' : 'No'} />
        <Dato etiqueta="Observación de recepción" valor={recepcion.observacion?.trim() || 'Sin observaciones'} />
        </dl>
        {liberacion && <Alert p="sm" className={clases.capacidad} color={liberacion.estado === 'CONFIRMADA' ? 'green' : 'yellow'} title={liberacion.estado === 'CONFIRMADA' ? 'Capacidad liberada'
          : liberacion.requiereRevision ? 'Liberación de capacidad pendiente de revisión' : 'Liberación de capacidad pendiente'}>
          <Fecha valor={liberacion.confirmadaEn ?? liberacion.actualizadaEn} />
        </Alert>}
      </>}
    </Stack></Card>
    <div className={clases.historial}><HistorialEstados titulo="Historial del despacho" estado="datos" entradas={adaptarHistorial(detalle)} /></div>
    <Card component="section" aria-labelledby="titulo-comunicaciones"><Stack gap="md">
      <Title order={2} size="h4" className={clases.tituloSeccion} id="titulo-comunicaciones">Comunicación con Ventas</Title>
      {detalle.comunicaciones.length === 0 ? <Text>No hay comunicaciones registradas</Text> : detalle.comunicaciones.map((evento) => <Stack gap="sm" key={evento.idEvento} className={clases.comunicacion}>
        <Group justify="space-between" align="flex-start"><Text fw={600}>{nombreComunicacion(evento.tipoEvento)}</Text>
          <Text size="sm" className={clases.estadoEnvio}>{evento.estadoEnvio === 'ENVIADO' ? 'Enviado' : evento.estadoEnvio === 'ENVIO_FALLIDO' ? 'Envío fallido' : 'Pendiente'}</Text></Group>
        {evento.tipoEvento === 'DESPACHO_DEVUELTO_A_ORIGEN' && evento.estadoEnvio === 'ENVIO_FALLIDO' && <Text size="sm">
          El cierre está registrado. La comunicación requiere revisión o reenvío manual.
        </Text>}
        <dl className={clases.datos}>
        <Dato etiqueta="Registrado" valor={<Fecha valor={evento.creadoEn} />} />
        {evento.enviadoEn && <Dato etiqueta="Enviado" valor={<Fecha valor={evento.enviadoEn} />} />}
        </dl>
      </Stack>)}
    </Stack></Card>
  </>;
}

function nombreComunicacion(tipo: string) {
  const nombres: Record<string, string> = { DESPACHO_FALLIDO: 'Entrega fallida', DESPACHO_REPROGRAMADO: 'Despacho reprogramado',
    DESPACHO_ENTREGADO: 'Entrega confirmada', DESPACHO_DEVUELTO_A_ORIGEN: 'Despacho devuelto a origen' };
  return nombres[tipo] ?? 'Actualización del despacho';
}

export function PaginaDetalleIncidencia({ destinos = {} }: { destinos?: DestinosDetalleIncidencia }) {
  const paginaRef = useRef<HTMLDivElement>(null);
  const { idDespacho = '' } = useParams();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const origen = parametros.get('origen') ?? '';
  const consultaOrigen = Object.keys(leerFiltros(new URLSearchParams(origen)).errores).length === 0 ? origen : '';
  const rutaListado = `/entregas-fallidas${consultaOrigen ? `?${consultaOrigen}` : ''}`;
  const consulta = useDetalleIncidencia(idDespacho, parametros.get('incidencia'));
  const detalle = consulta.detalle;
  const [recepcion, establecerRecepcion] = useState<ContextoRecepcion | null>(null);
  const [modalAbierto, establecerModalAbierto] = useState(false);
  const [avisoRecepcion, establecerAvisoRecepcion] = useState('');
  const [reprogramacion, establecerReprogramacion] = useState<ContextoDecisionIncidencia | null>(null);
  const [reprogramacionAbierta, establecerReprogramacionAbierta] = useState(false);
  const [reprogramacionPendiente, establecerReprogramacionPendiente] = useState(false);
  const [cierre, establecerCierre] = useState<ContextoDecisionIncidencia | null>(null);
  const [cierreAbierto, establecerCierreAbierto] = useState(false);
  const [cierrePendiente, establecerCierrePendiente] = useState(false);
  useEffect(() => { establecerModalAbierto(false); establecerRecepcion(null); establecerAvisoRecepcion('');
    establecerReprogramacionAbierta(false); establecerReprogramacion(null); establecerReprogramacionPendiente(false);
    establecerCierreAbierto(false); establecerCierre(null); establecerCierrePendiente(false); }, [idDespacho]);
  const estado = detalle ? 'datos' : consulta.cargando ? 'carga' : consulta.error?.sinPermiso ? 'sinPermiso' : consulta.error?.noEncontrado ? 'noEncontrado' : 'error';
  if (estado === 'sinPermiso') return <EstadoVista estado="sinPermiso" descripcion={consulta.error?.mensaje}
    accion={{ id: 'reintentar', etiqueta: 'Reintentar detalle' }} alAccionar={consulta.actualizar} />;
  return <Stack ref={paginaRef} gap="md" className={clases.pagina}>
    {avisoRecepcion && <Alert color="green" role="status">{avisoRecepcion}</Alert>}
    {cierre && <ModalCierreDespacho contexto={cierre} abierto={cierreAbierto && cierre?.idDespacho === idDespacho}
      alResultadoDesconocido={establecerCierrePendiente}
      alCerrar={() => establecerCierreAbierto(false)} alActualizar={consulta.actualizar} alRevocar={consulta.retirarAutorizacion}
      alCompletar={() => navegar(rutaListado, { state: { cierre: true } })}
      alRecuperarFoco={() => {
        const titulo = paginaRef.current?.querySelector<HTMLElement>('h1');
        if (titulo) { titulo.tabIndex = -1; titulo.focus(); }
      }} />}
    <ModalReprogramacionDespacho contexto={reprogramacion} abierto={reprogramacionAbierta && reprogramacion?.idDespacho === idDespacho}
      alResultadoDesconocido={establecerReprogramacionPendiente}
      alCerrar={() => establecerReprogramacionAbierta(false)} alActualizar={consulta.actualizar} alRevocar={consulta.retirarAutorizacion}
      alCompletar={(resultado) => navegar(rutaListado, { state: { reprogramacion: { fechaProgramada: resultado.fechaProgramada } } })}
      alRecuperarFoco={() => {
        const titulo = paginaRef.current?.querySelector<HTMLElement>('h1');
        if (titulo) { titulo.tabIndex = -1; titulo.focus(); }
      }} />
    <ModalRecepcionPaquete contexto={recepcion} abierto={modalAbierto && recepcion?.idDespacho === idDespacho} alCerrar={() => establecerModalAbierto(false)}
      alRecuperarFoco={() => {
        const titulo = paginaRef.current?.querySelector<HTMLElement>('h1');
        if (titulo) { titulo.tabIndex = -1; titulo.focus(); }
      }} alActualizar={consulta.actualizar} alAvisar={establecerAvisoRecepcion} alRevocar={consulta.retirarAutorizacion} />
    <Breadcrumbs><Anchor component={Link} to={rutaListado}>Entregas fallidas</Anchor><Text>Detalle de incidencia</Text></Breadcrumbs>
    {cierrePendiente && !cierreAbierto && <Alert color="yellow" title="Cierre por comprobar" role="status">
      <Text size="sm">Hay una solicitud enviada cuyo resultado no se comprobó. Consulta y recupera la solicitud original antes de otra decisión.</Text>
      <Button variant="outline" mt="sm" onClick={() => establecerCierreAbierto(true)}>Revisar cierre pendiente</Button>
    </Alert>}
    {reprogramacionPendiente && !reprogramacionAbierta && <Alert color="yellow" title="Reprogramación por comprobar" role="status">
      <Text size="sm">Hay una solicitud enviada cuyo resultado no se comprobó, aunque el despacho haya cambiado de estado.</Text>
      <Button variant="outline" mt="sm" onClick={() => establecerReprogramacionAbierta(true)}>Revisar reprogramación pendiente</Button>
    </Alert>}
    <EncabezadoPagina titulo={detalle ? `Incidencia · ${detalle.codigoRastreoInterno}` : 'Detalle de incidencia'}
      subtitulo="Última incidencia y trazabilidad del despacho · Hora de Lima" acciones={<Group>
        <Button type="button" variant="subtle" leftSection={<IconArrowLeft size={18} aria-hidden="true" />} onClick={() => navegar(rutaListado)}>Volver al listado</Button>
        <Button type="button" variant="outline" leftSection={<IconRefresh size={18} aria-hidden="true" />} disabled={consulta.cargando} onClick={consulta.actualizar}>Actualizar detalle</Button>
      </Group>} />
    <EstadoVista estado={estado} titulo={consulta.error?.noEncontrado ? 'Detalle no encontrado' : undefined} descripcion={!detalle ? consulta.error?.mensaje : undefined}
      esqueleto={<Stack><Skeleton height={100} /><Skeleton height={300} /></Stack>}
      accion={estado === 'error' ? { id: 'reintentar', etiqueta: 'Reintentar detalle' } : undefined} alAccionar={consulta.actualizar}>
      {detalle && <Stack gap="md" aria-busy={consulta.cargando}>
        <div className={clases.resumen}>
          <Group><BadgeEstado contexto="despacho" valor={detalle.estado} />{detalle.pedidoAnulado && <BadgeEstado contexto="etiqueta" valor="PEDIDO_ANULADO" />}</Group>
          <dl className={clases.fechasResumen}><Dato etiqueta="Última actualización" valor={<Fecha valor={detalle.actualizadoEn} />} />
            <Dato etiqueta="Último cambio de estado" valor={<Fecha valor={detalle.ultimoCambioEstadoEn} />} /></dl>
        </div>
        {detalle.pedidoAnulado && <Alert color="red" icon={<IconInfoCircle size={20} aria-hidden="true" />} title="Pedido anulado">
          El pedido fue anulado por Ventas y Postventa. {detalle.incidencia.recepcion.estado === 'PENDIENTE_RETORNO'
            ? 'Primero confirma la recepción del paquete; después podrás cerrar el despacho.' : 'Solo puedes cerrar el despacho como devuelto a origen.'}
        </Alert>}
        {detalle.estado !== 'FALLIDO' && <Alert color="blue">Consulta histórica. El despacho ya no está fallido.</Alert>}
        {(consulta.cambioIncidencia || consulta.cargando) && <div role="status" aria-live="polite">
          {consulta.cambioIncidencia && <Alert color="blue">La incidencia cambió. Se muestra la información de la nueva salida; revisa sus datos antes de decidir.</Alert>}
          {consulta.cargando && <Text>Actualizando. Las decisiones están bloqueadas mientras se confirma la información.</Text>}
        </div>}
        {consulta.error && <FranjaEstado tipo="datosDesactualizados"
          mensaje={`${consulta.error.mensaje} Las decisiones permanecerán bloqueadas hasta actualizar.`}
          accion={{ id: 'actualizar', etiqueta: 'Reintentar detalle', disabled: consulta.cargando, loading: consulta.cargando }}
          alAccionar={consulta.actualizar} />}
        <Grid gap="lg" align="flex-start"><Grid.Col span={{ base: 12, lg: 7 }}><Stack gap="lg"><InformacionIncidencia detalle={detalle} /></Stack></Grid.Col>
          <Grid.Col span={{ base: 12, lg: 5 }} className={clases.columnaResolucion}>
            <Stack component="aside" aria-label="Evidencia y decisiones de la incidencia" tabIndex={0} gap="lg" className={clases.panelResolucion}>
            <EvidenciaIncidencia key={detalle.incidencia.idIncidencia} detalle={detalle} alRevocar={consulta.retirarAutorizacion} />
            <PanelDecisionIncidencia detalle={detalle} bloqueada={consulta.cargando || Boolean(consulta.error) || cierrePendiente || reprogramacionPendiente} destinos={{ ...destinos,
              cerrarComoDevueltoAOrigen: destinos.cerrarComoDevueltoAOrigen ?? ((contexto) => { establecerCierre(contexto); establecerCierreAbierto(true); }),
              reprogramar: destinos.reprogramar ?? ((contexto) => { establecerReprogramacion(contexto); establecerReprogramacionAbierta(true); }),
              confirmarRecepcion: destinos.confirmarRecepcion ?? ((contexto) => { establecerRecepcion(contexto); establecerModalAbierto(true); }) }}
              alCompletar={(resultado) => { if (resultado === 'resolucion') navegar(rutaListado); else consulta.actualizar(); }} />
          </Stack></Grid.Col></Grid>
        <Text size="sm" c="dimmed">Última consulta confirmada: {formatoFechaLima.format(new Date(detalle.consultadoEn))} · America/Lima</Text>
      </Stack>}
    </EstadoVista>
  </Stack>;
}
