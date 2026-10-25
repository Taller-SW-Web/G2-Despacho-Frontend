import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Alert, Button, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconClockHour4, IconPackageImport, IconRefresh } from '@tabler/icons-react';
import { EncabezadoPagina, EstadoVista, FranjaEstado, TarjetaKpi, type EstadoConsulta } from '@despacho/componentes-compartidos';
import { filtrosIniciales, formatoFechaLima, leerFiltros, parametrosFiltros, type FiltrosFallidos } from './modelo';
import { FiltrosEntregasFallidas } from './FiltrosEntregasFallidas';
import { TablaEntregasFallidas, type DestinosEntregasFallidas } from './TablaEntregasFallidas';
import { useEntregasFallidas } from './useEntregasFallidas';
import { ModalRecepcionPaquete, type ContextoRecepcion } from './ModalRecepcionPaquete';

export function PaginaEntregasFallidas(destinos: DestinosEntregasFallidas) {
  const paginaRef = useRef<HTMLDivElement>(null);
  const [parametros, establecerParametros] = useSearchParams();
  const ubicacion = useLocation();
  const clave = parametros.toString();
  const { filtros, errores } = useMemo(() => leerFiltros(new URLSearchParams(clave)), [clave]);
  const valida = Object.keys(errores).length === 0;
  const [revision, actualizar] = useState(0);
  const [recepcion, establecerRecepcion] = useState<ContextoRecepcion | null>(null);
  const [modalAbierto, establecerModalAbierto] = useState(false);
  const [avisoRecepcion, establecerAvisoRecepcion] = useState('');
  const [accesoRevocado, establecerAccesoRevocado] = useState(false);
  // Cambiar de entrada del historial vuelve a consultar, incluso con la misma búsqueda.
  const consulta = useEntregasFallidas(clave, valida, `${ubicacion.key}:${revision}`);
  const pagina = consulta.resultado?.pagina ?? null;
  const desfasada = Boolean(consulta.resultado && consulta.resultado.clave !== clave);
  const confirmada = valida && !desfasada && !consulta.error && !consulta.cargando;
  const cambiar = (cambio: Partial<FiltrosFallidos>) => establecerParametros(parametrosFiltros({ ...filtros, pagina: 1, ...cambio }));
  const limpiar = () => establecerParametros(parametrosFiltros({ ...filtrosIniciales, tamanoPagina: filtros.tamanoPagina }));
  const reintentar = () => { establecerAccesoRevocado(false); actualizar((valor) => valor + 1); };
  const todos = () => cambiar({ recepcion: 'TODOS', soloRetornosAtrasados: false });

  // La lectura del servidor puede dejar una página vacía después de una recepción/reprogramación.
  useEffect(() => {
    if (valida && !consulta.cargando && !consulta.error && consulta.resultado?.clave === clave && pagina) {
      const ultima = Math.max(1, pagina.totalPaginas);
      if (filtros.pagina > ultima) establecerParametros(parametrosFiltros({ ...filtros, pagina: ultima }), { replace: true });
    }
  }, [clave, valida, consulta.cargando, consulta.error, consulta.resultado, pagina, filtros, establecerParametros]);

  const seleccionar = (id: string) => {
    if (id === 'atrasados') cambiar(filtros.soloRetornosAtrasados ? { recepcion: 'TODOS', soloRetornosAtrasados: false } : { recepcion: 'PENDIENTE_RETORNO', soloRetornosAtrasados: true });
    else {
      const recepcion = id === 'pendientes' ? 'PENDIENTE_RETORNO' : 'RECIBIDO_EN_CENTRO';
      cambiar({ recepcion: filtros.recepcion === recepcion && !filtros.soloRetornosAtrasados ? 'TODOS' : recepcion, soloRetornosAtrasados: false });
    }
  };
  const tieneFiltros = Boolean(filtros.motivo || filtros.fechaDesde || filtros.fechaHasta || filtros.recepcion !== 'TODOS' || filtros.soloRetornosAtrasados);
  const paginaFuera = Boolean(pagina && filtros.pagina > Math.max(1, pagina.totalPaginas) && confirmada);
  let estadoTabla: EstadoConsulta = consulta.cargando && !pagina || paginaFuera ? 'carga'
    : !valida || consulta.error && !pagina?.contenido.length ? 'error'
    : pagina?.contenido.length ? 'datos' : tieneFiltros ? 'sinResultados' : 'vacio';
  // Una selección fallida de solo atrasados nunca muestra una página anterior como su resultado.
  if (consulta.error?.jornadas) estadoTabla = 'error';
  const indicadores = pagina?.indicadores;
  const error = consulta.error;
  if (consulta.sinPermiso || accesoRevocado) return <EstadoVista estado="sinPermiso" alAccionar={reintentar} />;
  return <Stack ref={paginaRef} gap="lg" style={{ minWidth: 0 }}>
    {avisoRecepcion && <Alert color="green" role="status">{avisoRecepcion}</Alert>}
    <ModalRecepcionPaquete contexto={recepcion} abierto={modalAbierto} alCerrar={() => establecerModalAbierto(false)}
      alRecuperarFoco={() => {
        const titulo = paginaRef.current?.querySelector<HTMLElement>('h1');
        if (titulo) { titulo.tabIndex = -1; titulo.focus(); }
      }} alActualizar={reintentar} alAvisar={establecerAvisoRecepcion} alRevocar={() => establecerAccesoRevocado(true)} />
    <EncabezadoPagina titulo="Entregas fallidas" subtitulo="Consulta las incidencias vigentes y el retorno de paquetes al centro."
      acciones={<Button type="button" variant="default" size="sm" mih={44} leftSection={<IconRefresh size={18} aria-hidden="true" />}
        disabled={consulta.cargando || !valida} onClick={reintentar}>Actualizar</Button>} />
    <EstadoVista estado="datos">
      <Stack gap="lg" style={{ minWidth: 0 }}>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
          <TarjetaKpi id="pendientes" etiqueta="Pendientes de retorno" tono="warning" valor={indicadores?.pendientesRetorno ?? null} icono={<IconClockHour4 aria-hidden="true" />}
            accionable seleccionada={filtros.recepcion === 'PENDIENTE_RETORNO' && !filtros.soloRetornosAtrasados} cargando={!pagina && consulta.cargando}
            disabled={!confirmada || !pagina} alSeleccionar={seleccionar} descripcion="Paquetes que aún deben volver al centro" />
          <TarjetaKpi id="recibidos" etiqueta="Recibidos en centro" tono="success" valor={indicadores?.recibidosCentro ?? null} icono={<IconPackageImport aria-hidden="true" />}
            accionable seleccionada={filtros.recepcion === 'RECIBIDO_EN_CENTRO'} cargando={!pagina && consulta.cargando}
            disabled={!confirmada || !pagina} alSeleccionar={seleccionar} descripcion="Listos para revisar la incidencia" />
          <TarjetaKpi id="atrasados" etiqueta="Retornos atrasados" tono="error" valor={indicadores?.retornosAtrasados ?? null} icono={<IconAlertTriangle aria-hidden="true" />}
            accionable seleccionada={filtros.soloRetornosAtrasados} cargando={!pagina && consulta.cargando}
            disabled={!confirmada || indicadores?.retornosAtrasados == null} alSeleccionar={seleccionar} descripcion="Incluidos en pendientes de retorno" />
        </SimpleGrid>
        {confirmada && indicadores && indicadores.retornosSinJornadaConfirmada > 0 && <Alert color="yellow.8" title="Información de jornada no disponible" role="status">
          <Text>No se pudo evaluar el retorno de {indicadores.retornosSinJornadaConfirmada} paquetes. El indicador de atrasados no está disponible.</Text>
          <Button type="button" variant="subtle" mih={44} onClick={reintentar}>Reintentar consulta</Button>
        </Alert>}
        {consulta.errorCatalogo && <Alert color="yellow.8" title="No se pudo cargar el catálogo de motivos">
          <Text>Reintenta para recuperar las opciones del filtro.</Text><Button type="button" variant="subtle" mih={44} onClick={reintentar}>Reintentar catálogo</Button>
        </Alert>}
        <FiltrosEntregasFallidas filtros={filtros} motivos={consulta.motivos} errores={{ ...errores, ...error?.campos }}
          consultando={consulta.cargando} catalogoDisponible={!consulta.errorCatalogo && consulta.motivos.length > 0} alCambiar={cambiar} alLimpiar={limpiar} />
        {!valida && <Alert color="red.8" title="Revisa los filtros de la URL" role="alert">
          {Object.entries(errores).map(([campo, mensaje]) => <Text key={campo}>{mensaje}</Text>)}
          <Button type="button" variant="subtle" mih={44} onClick={limpiar}>Restablecer consulta</Button>
        </Alert>}
        {error && <Alert color="red.8" title="No se pudo completar la consulta" role="alert">
          <Text>{error.mensaje}</Text><Group mt="sm"><Button type="button" variant="outline" mih={44} onClick={reintentar}>Reintentar consulta</Button>
            {error.jornadas ? <Button type="button" variant="subtle" mih={44} onClick={todos}>Ver todos los grupos</Button>
              : <Button type="button" variant="subtle" mih={44} onClick={limpiar}>Restablecer consulta</Button>}</Group>
        </Alert>}
        {pagina && (desfasada || consulta.cargando || error || !valida) && <FranjaEstado tipo="datosDesactualizados"
          mensaje={desfasada || !valida ? 'Se conservan los resultados anteriores; no corresponden a los filtros actuales.'
            : error ? 'Se conservan los resultados anteriores. No se pudieron actualizar.' : 'Actualizando. Se muestran los últimos resultados confirmados.'} />}
        {pagina && <Text size="sm" c="dimmed">Última consulta confirmada: {formatoFechaLima.format(new Date(pagina.consultadoEn))} · America/Lima</Text>}
        <TablaEntregasFallidas {...destinos} alConfirmarRecepcion={destinos.alConfirmarRecepcion ?? ((fila) => {
          establecerRecepcion(fila); establecerModalAbierto(true);
        })} pagina={pagina} consulta={consulta.resultado?.clave ?? clave} estado={estadoTabla}
          actualizando={!confirmada} alCambiarPagina={(numero) => cambiar({ pagina: numero })} alCambiarTamano={(tamano) => cambiar({ tamanoPagina: tamano })}
          renderizarEstado={() => <EstadoVista estado={estadoTabla === 'datos' || estadoTabla === 'carga' ? 'error' : estadoTabla}
            titulo={estadoTabla === 'vacio' ? 'No hay entregas fallidas por resolver' : estadoTabla === 'error' ? 'La consulta no está disponible' : undefined}
            descripcion={estadoTabla === 'vacio' ? 'Aquí aparecerán los despachos que requieran revisar una incidencia.' : estadoTabla === 'error' ? 'Revisa el aviso y utiliza las acciones de recuperación.' : undefined}
            accion={estadoTabla === 'sinResultados' ? { id: 'limpiar', etiqueta: 'Limpiar filtros' } : undefined}
            alAccionar={limpiar} />} />
        {!destinos.alVerDetalle && <Text id="dependencias-f04" size="sm" c="dimmed">
          {!destinos.alVerDetalle && 'Ver detalle estará disponible al integrar la consulta de incidencia. '}
        </Text>}
      </Stack>
    </EstadoVista>
  </Stack>;
}
