import { Anchor, Alert, Badge, Breadcrumbs, Button, Card, Grid, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BadgeEstado, EncabezadoPagina, EstadoVista, HistorialEstados, VisorEvidencia } from '@despacho/componentes-compartidos';
import { IconCamera, IconRefresh } from '@tabler/icons-react';
import { formatoFechaLima, leerFiltros } from './modelo';
import { adaptarHistorial, type DestinosDetalleIncidencia, type DetalleIncidencia } from './modeloDetalle';
import { PanelDecisionIncidencia } from './PanelDecisionIncidencia';
import { useDetalleIncidencia } from './useDetalleIncidencia';
import { useEvidenciaIncidencia } from './useEvidenciaIncidencia';
import clases from './DetalleIncidencia.module.css';

function Fecha({ valor }: { valor: string }) {
  return <Text component="time" dateTime={valor}>{formatoFechaLima.format(new Date(valor))} · Hora de Lima</Text>;
}
function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return <Stack gap="xs"><Text size="sm" c="dimmed">{etiqueta}</Text>{typeof valor === 'string' ? <Text>{valor}</Text> : valor}</Stack>;
}
function EvidenciaIncidencia({ detalle, alRevocar }: { detalle: DetalleIncidencia; alRevocar: () => void }) {
  const incidencia = detalle.incidencia;
  const visor = useEvidenciaIncidencia(detalle.idDespacho, incidencia.idIncidencia, incidencia.evidencia.idEvidencia, alRevocar);
  const ausencia = incidencia.evidencia.estadoReferencia === 'SIN_EVIDENCIA' ? 'No intentado — sin foto' : 'Falta la referencia de evidencia';
  const propiedades = visor.estado === 'lista' && visor.url ? { estado: 'lista' as const, urlAutorizada: visor.url }
    : { estado: visor.estado === 'lista' ? 'error' as const : visor.estado, urlAutorizada: null };
  return <Card component="section" aria-labelledby="titulo-evidencia"><Stack gap="md">
    <Title order={2} size="h3" id="titulo-evidencia">Evidencia de la incidencia</Title>
    {incidencia.evidencia.idEvidencia ? <>
      <Text size="sm">Consulta y amplía la fotografía de esta salida.</Text>
      <Button type="button" variant="outline" leftSection={<IconCamera size={18} aria-hidden="true" />} onClick={() => void visor.abrir()}>Ver fotografía</Button>
    </> : <Alert color={incidencia.evidencia.estadoReferencia === 'SIN_EVIDENCIA' ? 'blue' : 'yellow'}>{ausencia}</Alert>}
    <VisorEvidencia {...propiedades} abierto={visor.abierto} descripcion={`Evidencia de la incidencia del despacho ${detalle.codigoRastreoInterno}`}
      mensajeSinEvidencia={ausencia} alCerrar={visor.cerrar} alSolicitarAcceso={() => void visor.abrir()} alFallarImagen={visor.fallarImagen} />
  </Stack></Card>;
}
function InformacionIncidencia({ detalle }: { detalle: DetalleIncidencia }) {
  const incidencia = detalle.incidencia;
  const recepcion = incidencia.recepcion;
  const liberacion = recepcion.liberacionCapacidad;
  return <>
    <Card component="section" aria-labelledby="titulo-incidencia"><Stack gap="md">
      <Title order={2} size="h3" id="titulo-incidencia">Última incidencia</Title>
      <Dato etiqueta="Motivo" valor={incidencia.motivo.etiqueta} />
      <Dato etiqueta="Comentario" valor={incidencia.comentario?.trim() || 'Sin comentario'} />
      <Dato etiqueta="Fecha de incidencia" valor={<Fecha valor={incidencia.fechaIncidencia} />} />
      <Dato etiqueta="Repartidor" valor={<Stack gap="xs"><Text>{incidencia.repartidor.nombre ?? 'Nombre del repartidor no disponible'}</Text><Text size="sm">{incidencia.repartidor.idRepartidor}</Text></Stack>} />
      <Dato etiqueta="Intentos consumidos" valor={`${detalle.numeroIntentos} de ${detalle.maximoIntentos}`} />
      {incidencia.motivo.codigo === 'NO_INTENTADO' && <Alert color="blue" title="No intentado en esta salida">Esta salida no consumió intento; se conserva el contador acumulado.</Alert>}
      <Dato etiqueta="Jornada de la incidencia" valor={`${incidencia.jornada.idJornada} · ${incidencia.jornada.estado === 'DESCONOCIDA' ? 'Estado desconocido' : incidencia.jornada.estado === 'CERRADA' ? 'Cerrada' : 'Activa'}`} />
      {incidencia.jornada.cerradaEn && <Dato etiqueta="Cierre de jornada" valor={<Fecha valor={incidencia.jornada.cerradaEn} />} />}
      {incidencia.retornoAtrasado === true && <Alert color="red">Retorno atrasado: la jornada cerró y el paquete sigue pendiente de retorno.</Alert>}
      {(incidencia.repartidor.nombre === null || incidencia.jornada.estado === 'DESCONOCIDA') && <Alert color="yellow" title="Información operativa no disponible">
        Se conservan los datos de la incidencia. {incidencia.jornada.estado === 'DESCONOCIDA' && 'No se pudo confirmar el cierre de esta jornada.'}
      </Alert>}
    </Stack></Card>
    <Card component="section" aria-labelledby="titulo-recepcion"><Stack gap="md">
      <Title order={2} size="h3" id="titulo-recepcion">Recepción en centro</Title>
      <Group><BadgeEstado contexto="recepcion" valor={recepcion.estado} /></Group>
      {recepcion.estado === 'RECIBIDO_EN_CENTRO' && <>
        <Dato etiqueta="Recepción confirmada" valor={recepcion.confirmadaEn && <Fecha valor={recepcion.confirmadaEn} />} />
        <Dato etiqueta="Usuario que confirmó" valor={recepcion.idUsuario} />
        <Dato etiqueta="Sello intacto" valor={recepcion.selloIntacto ? 'Sí' : 'No'} />
        <Dato etiqueta="Observación de recepción" valor={recepcion.observacion?.trim() || 'Sin observaciones'} />
        {liberacion && <Alert color={liberacion.estado === 'CONFIRMADA' ? 'green' : 'yellow'} title={liberacion.estado === 'CONFIRMADA' ? 'Capacidad liberada'
          : liberacion.requiereRevision ? 'Liberación de capacidad pendiente de revisión' : 'Liberación de capacidad pendiente'}>
          El retorno físico está confirmado. <Fecha valor={liberacion.confirmadaEn ?? liberacion.actualizadaEn} />
        </Alert>}
      </>}
    </Stack></Card>
    <HistorialEstados titulo="Historial del despacho" estado="datos" entradas={adaptarHistorial(detalle)} />
    <Card component="section" aria-labelledby="titulo-comunicaciones"><Stack gap="md">
      <Title order={2} size="h3" id="titulo-comunicaciones">Comunicación con Ventas</Title>
      {detalle.comunicaciones.length === 0 ? <Text>No hay comunicaciones registradas</Text> : detalle.comunicaciones.map((evento) => <Stack gap="xs" key={evento.idEvento}>
        <Text fw={600}>{evento.tipoEvento.replaceAll('_', ' ')}</Text>
        <Text>{evento.estadoEnvio === 'ENVIADO' ? 'Enviado' : evento.estadoEnvio === 'ENVIO_FALLIDO' ? 'Envío fallido' : 'Pendiente'}</Text>
        <Dato etiqueta="Registrado" valor={<Fecha valor={evento.creadoEn} />} />
        {evento.enviadoEn && <Dato etiqueta="Enviado" valor={<Fecha valor={evento.enviadoEn} />} />}
      </Stack>)}
    </Stack></Card>
  </>;
}

export function PaginaDetalleIncidencia({ destinos = {} }: { destinos?: DestinosDetalleIncidencia }) {
  const { idDespacho = '' } = useParams();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const origen = parametros.get('origen') ?? '';
  const consultaOrigen = Object.keys(leerFiltros(new URLSearchParams(origen)).errores).length === 0 ? origen : '';
  const rutaListado = `/entregas-fallidas${consultaOrigen ? `?${consultaOrigen}` : ''}`;
  const consulta = useDetalleIncidencia(idDespacho, parametros.get('incidencia'));
  const detalle = consulta.detalle;
  const estado = detalle ? 'datos' : consulta.cargando ? 'carga' : consulta.error?.sinPermiso ? 'sinPermiso' : consulta.error?.noEncontrado ? 'noEncontrado' : 'error';
  return <Stack gap="lg" className={clases.pagina}>
    <Breadcrumbs><Anchor component={Link} to={rutaListado}>Entregas fallidas</Anchor><Text>Detalle de incidencia</Text></Breadcrumbs>
    <EncabezadoPagina titulo={detalle ? `Incidencia · ${detalle.codigoRastreoInterno}` : 'Detalle de incidencia'}
      subtitulo="Última incidencia y trazabilidad del despacho" acciones={<Group>
        <Button type="button" variant="default" onClick={() => navegar(rutaListado)}>Volver al listado</Button>
        <Button type="button" variant="outline" leftSection={<IconRefresh size={18} aria-hidden="true" />} disabled={consulta.cargando} onClick={consulta.actualizar}>Actualizar detalle</Button>
      </Group>} />
    <EstadoVista estado={estado} titulo={consulta.error?.noEncontrado ? 'Detalle no encontrado' : undefined} descripcion={!detalle ? consulta.error?.mensaje : undefined}
      esqueleto={<Stack><Skeleton height={100} /><Skeleton height={300} /></Stack>}
      accion={estado === 'error' || estado === 'sinPermiso' ? { id: 'reintentar', etiqueta: 'Reintentar detalle' } : undefined} alAccionar={consulta.actualizar}>
      {detalle && <Stack gap="lg" aria-busy={consulta.cargando}>
        <Group><BadgeEstado contexto="despacho" valor={detalle.estado} />{detalle.pedidoAnulado && <Badge color="gray">Pedido anulado</Badge>}</Group>
        <Group align="flex-start" gap="xl"><Dato etiqueta="Última actualización" valor={<Fecha valor={detalle.actualizadoEn} />} />
          <Dato etiqueta="Último cambio de estado" valor={<Fecha valor={detalle.ultimoCambioEstadoEn} />} /></Group>
        {detalle.estado !== 'FALLIDO' && <Alert color="blue">Consulta histórica. El despacho ya no está fallido.</Alert>}
        <div role="status" aria-live="polite">
          {consulta.cambioIncidencia && <Alert color="blue">La incidencia cambió. Se muestra la información de la nueva salida; revisa sus datos antes de decidir.</Alert>}
          {consulta.cargando && <Text>Actualizando. Las decisiones están bloqueadas mientras se confirma la información.</Text>}
        </div>
        {consulta.error && <Alert color="red" title="Datos desactualizados" role="alert">{consulta.error.mensaje} Las decisiones permanecerán bloqueadas hasta actualizar.
          <Button type="button" variant="subtle" onClick={consulta.actualizar}>Reintentar detalle</Button></Alert>}
        <Grid gap="lg"><Grid.Col span={{ base: 12, lg: 7 }}><Stack gap="lg"><InformacionIncidencia detalle={detalle} /></Stack></Grid.Col>
          <Grid.Col span={{ base: 12, lg: 5 }}><Stack gap="lg"><EvidenciaIncidencia key={detalle.incidencia.idIncidencia} detalle={detalle} alRevocar={consulta.retirarAutorizacion} />
            <PanelDecisionIncidencia detalle={detalle} bloqueada={consulta.cargando || Boolean(consulta.error)} destinos={destinos}
              alCompletar={(resultado) => { if (resultado === 'resolucion') navegar(rutaListado); else consulta.actualizar(); }} />
          </Stack></Grid.Col></Grid>
        <Text size="sm" c="dimmed">Última consulta confirmada: {formatoFechaLima.format(new Date(detalle.consultadoEn))} · America/Lima</Text>
      </Stack>}
    </EstadoVista>
  </Stack>;
}
