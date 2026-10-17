import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Group, Modal, SimpleGrid, Stack, Tabs, Text, Tooltip } from '@mantine/core';
import { IconCalendarEvent, IconCalendarTime, IconChevronDown, IconFlask, IconRefresh, IconRepeat } from '@tabler/icons-react';
import { EncabezadoPagina, EstadoVista, notificarOperacion, TarjetaKpi, type EstadoConsulta } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarPendientes, consultarZonas, generarSimulacion, interpretarError, type ErrorProgramacion } from './api';
import { diaSiguiente, filtrosIniciales, formatoInstante, leerFiltros, parametrosFiltros, type FiltrosPendientes, type Pendiente, type SolicitudSimulacion } from './modelo';
import { useLecturaProgramacion, useVigenciaProgramacion } from './useLecturaProgramacion';
import { FiltrosProgramacion } from './FiltrosProgramacion';
import { TablaCola } from './TablaCola';
import { ModalSimulacion } from './ModalSimulacion';
import { ModalAsignacion } from './ModalAsignacion';
import { ResumenDespacho } from './ResumenDespacho';
import clases from './Programacion.module.css';

/** Cambiar/cerrar sesión desmonta consultas, selección y formularios protegidos. */
export function PaginaProgramacion() {
  const [sesion, establecerSesion] = useState(0);
  useEffect(() => {
    const cambiar = () => establecerSesion((valor) => valor + 1);
    const almacen = (evento: StorageEvent) => { if (!evento.key || evento.key.startsWith('despacho.')) cambiar(); };
    window.addEventListener('despacho:sesion', cambiar);
    window.addEventListener('storage', almacen);
    return () => { window.removeEventListener('despacho:sesion', cambiar); window.removeEventListener('storage', almacen); };
  }, []);
  return <PanelProgramacion key={sesion} />;
}

function PanelProgramacion() {
  const cliente = useClienteApi();
  const ubicacion = useLocation();
  const [parametros, establecerParametros] = useSearchParams();
  const clave = parametros.toString();
  const { filtros, errores } = useMemo(() => leerFiltros(new URLSearchParams(clave)), [clave]);
  const valida = Object.keys(errores).length === 0;
  const [denegada, establecerDenegada] = useState(false);
  const [asignacion, establecerAsignacion] = useState<Pendiente | null>(null);
  const [detalle, establecerDetalle] = useState<Pendiente | null>(null);
  const [personalizada, establecerPersonalizada] = useState(false);
  const [generando, establecerGenerando] = useState(false);
  const [errorSimulacion, establecerErrorSimulacion] = useState<ErrorProgramacion | null>(null);
  const [nuevo, establecerNuevo] = useState<string | null>(null);
  const enCurso = useRef(false);
  const origenModal = useRef<HTMLElement | null>(null);
  const generador = useRef<HTMLButtonElement>(null);
  const vigente = useRef(true);
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
  // La identidad de navegación fuerza una lectura incluso al restaurar la misma URL.
  const cargar = useCallback((signal: AbortSignal) => consultarPendientes(cliente, new URLSearchParams(clave), signal), [cliente, clave, ubicacion.key]);
  const cargarZonas = useCallback((signal: AbortSignal) => consultarZonas(cliente, signal), [cliente]);
  const consulta = useLecturaProgramacion(cargar, valida && !denegada);
  const catalogo = useLecturaProgramacion(cargarZonas, !denegada);
  const sinPermiso = denegada || Boolean(consulta.error?.permiso || catalogo.error?.permiso);
  const denegar = useCallback(() => { establecerDenegada(true); establecerAsignacion(null); establecerDetalle(null); establecerPersonalizada(false); }, []);
  useEffect(() => { if (sinPermiso) denegar(); }, [sinPermiso, denegar]);
  useVigenciaProgramacion(consulta.actualizar, !sinPermiso && valida && !asignacion && !detalle && !personalizada && !generando);
  const pagina = consulta.datos;
  const zonas = catalogo.datos ?? [];
  const cambiar = (cambio: Partial<FiltrosPendientes>) => establecerParametros(parametrosFiltros({ ...filtros, pagina: 1, ...cambio }));
  const limpiar = () => establecerParametros(parametrosFiltros({ ...filtrosIniciales, tamanoPagina: filtros.tamanoPagina }));
  const refrescar = () => { consulta.actualizar(); catalogo.actualizar(); };
  const recordarFoco = () => { origenModal.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; };
  const devolverFoco = () => requestAnimationFrame(() => {
    const destino = origenModal.current;
    if (destino?.isConnected && !destino.hasAttribute('disabled')) destino.focus();
    else generador.current?.focus();
  });
  const recargarCola = () => { establecerAsignacion(null); establecerDetalle(null); establecerPersonalizada(false); refrescar(); devolverFoco(); };
  useEffect(() => {
    if (pagina && filtros.pagina > Math.max(1, pagina.totalPaginas))
      establecerParametros(parametrosFiltros({ ...filtros, pagina: Math.max(1, pagina.totalPaginas) }), { replace: true });
  }, [pagina, filtros, establecerParametros]);
  useEffect(() => {
    if (!nuevo) return;
    const reloj = setTimeout(() => establecerNuevo(null), 5000);
    return () => clearTimeout(reloj);
  }, [nuevo]);
  // Consultar la cola tras una respuesta perdida precede a cualquier envío nuevo.
  const [revisandoResultado, establecerRevisandoResultado] = useState(false);
  useEffect(() => {
    if (revisandoResultado && pagina && !consulta.cargando) { establecerRevisandoResultado(false); establecerErrorSimulacion(null); }
  }, [revisandoResultado, pagina, consulta.cargando]);
  const revisarResultado = () => { establecerRevisandoResultado(true); establecerPersonalizada(false); refrescar(); };
  const generar = async (solicitud: SolicitudSimulacion) => {
    if (enCurso.current || sinPermiso || errorSimulacion?.incierto) return false;
    enCurso.current = true;
    establecerGenerando(true);
    establecerErrorSimulacion(null);
    try {
      const respuesta = await generarSimulacion(cliente, solicitud);
      if (!vigente.current) return false;
      establecerNuevo(respuesta.idDespacho);
      notificarOperacion({ id: `simulacion-${respuesta.idDespacho}`, tipo: 'exito', mensaje: `Pedido de prueba generado: ${respuesta.codigoOperativo}.` });
      consulta.actualizar();
      return true;
    } catch (fallo) {
      if (!vigente.current) return false;
      const error = interpretarError(fallo, true);
      if (error.permiso) denegar(); else establecerErrorSimulacion(error);
      return false;
    } finally {
      enCurso.current = false;
      if (vigente.current) establecerGenerando(false);
    }
  };
  const hayFiltros = Boolean(filtros.idZona || filtros.fechaDesde || filtros.fechaHasta || filtros.tipoIntento !== 'TODOS');
  const estado: EstadoConsulta = !valida || consulta.error ? 'error' : consulta.cargando ? 'carga'
    : pagina?.contenido.length ? 'datos' : hayFiltros ? 'sinResultados' : 'vacio';
  const bloqueada = sinPermiso || generando || !valida || consulta.cargando || Boolean(errorSimulacion?.incierto);
  const hoy = pagina?.fechaActualServidor;
  const indicador = (id: string) => {
    if (id === 'reintentos') cambiar({ tipoIntento: filtros.tipoIntento === 'REINTENTOS' ? 'TODOS' : 'REINTENTOS' });
    else if (hoy && id === 'hoy') cambiar({ fechaDesde: '', fechaHasta: filtros.fechaHasta === hoy && !filtros.fechaDesde ? '' : hoy });
    else if (hoy) cambiar({ fechaHasta: '', fechaDesde: filtros.fechaDesde === diaSiguiente(hoy) && !filtros.fechaHasta ? '' : diaSiguiente(hoy) });
  };
  return <Stack gap="lg" className={clases.pagina}>
    <EstadoVista estado={sinPermiso ? 'sinPermiso' : 'datos'} descripcion={sinPermiso ? 'Inicia sesión con una cuenta autorizada para acceder a Programación.' : undefined}
      accion={sinPermiso ? { id: 'reintentar', etiqueta: 'Reintentar acceso' } : undefined}
      alAccionar={() => { establecerDenegada(false); refrescar(); }}>
      <Stack gap="lg">
        <EncabezadoPagina titulo="Programación y asignación" subtitulo="Organiza los despachos de hoy y prepara las próximas entregas."
          acciones={<Group gap="sm"><Button ref={generador} variant="outline" type="button" mih={44} leftSection={<IconFlask size={20} aria-hidden="true" />}
            loading={generando} disabled={Boolean(errorSimulacion?.incierto)} onClick={() => { void generar({}); }}>Generar pedido de prueba</Button>
            <Button variant="outline" type="button" px="sm" mih={44} aria-label="Personalizar pedido de prueba" disabled={generando || Boolean(errorSimulacion?.incierto)}
              onClick={() => { recordarFoco(); establecerErrorSimulacion(null); establecerPersonalizada(true); }}><IconChevronDown size={20} aria-hidden="true" /></Button></Group>}
          pestanias={<Tabs value="pendientes"><Tabs.List><Tabs.Tab value="pendientes" rightSection={pagina && <Badge color="gray" variant="light">{pagina.indicadores.pendientesHoy + pagina.indicadores.programadosFuturo}</Badge>}>Cola de pendientes</Tabs.Tab>
            <Tooltip label="Las rutas y el reordenamiento aún no están disponibles."><span><Tabs.Tab value="rutas" disabled>Rutas por repartidor</Tabs.Tab></span></Tooltip>
          </Tabs.List></Tabs>} />
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} className={clases.kpis}>
          <TarjetaKpi id="hoy" etiqueta="Pendientes para hoy" valor={pagina?.indicadores.pendientesHoy ?? null} icono={<IconCalendarTime size={24} aria-hidden="true" />}
            accionable cargando={consulta.cargando} disabled={!pagina || bloqueada} seleccionada={Boolean(hoy && filtros.fechaHasta === hoy && !filtros.fechaDesde)}
            descripcion="Incluye fechas anteriores a hoy" alSeleccionar={indicador} />
          <TarjetaKpi id="futuro" etiqueta="Programados a futuro" valor={pagina?.indicadores.programadosFuturo ?? null} icono={<IconCalendarEvent size={24} color="var(--mantine-color-blue-8)" aria-hidden="true" />}
            accionable cargando={consulta.cargando} disabled={!pagina || bloqueada} seleccionada={Boolean(hoy && filtros.fechaDesde === diaSiguiente(hoy) && !filtros.fechaHasta)}
            descripcion="Se asignan desde su fecha programada" alSeleccionar={indicador} />
          <TarjetaKpi id="reintentos" etiqueta="Reintentos" valor={pagina?.indicadores.reintentos ?? null} icono={<IconRepeat size={24} color="var(--mantine-color-yellow-8)" aria-hidden="true" />}
            accionable cargando={consulta.cargando} disabled={!pagina || bloqueada} seleccionada={filtros.tipoIntento === 'REINTENTOS'}
            descripcion="Despachos con reprogramaciones previas" alSeleccionar={indicador} />
        </SimpleGrid>
        {catalogo.error && <Alert color="yellow.8" title="No se pudo cargar el catálogo de zonas"><Text>{catalogo.error.mensaje}</Text>
          <Button type="button" variant="outline" mt="sm" onClick={catalogo.actualizar}>Reintentar zonas</Button></Alert>}
        <FiltrosProgramacion filtros={filtros} zonas={zonas} errores={{ ...errores, ...consulta.error?.campos }} consultando={consulta.cargando} alCambiar={cambiar} alLimpiar={limpiar} />
        {!valida && <Alert color="red.8" title="Revisa los filtros de la URL" role="alert">{Object.entries(errores).map(([campo, mensaje]) => <Text key={campo}>{campo}: {mensaje}</Text>)}
          <Button type="button" variant="outline" mt="sm" onClick={limpiar}>Restablecer consulta</Button></Alert>}
        {consulta.error && <Alert color="red.8" title="No se pudo consultar la cola" role="alert">{consulta.error.mensaje}</Alert>}
        {errorSimulacion && <Alert color="red.8" title="No se pudo confirmar la generación" role="alert"><Text>{errorSimulacion.mensaje}</Text>
          {errorSimulacion.incierto && <Button type="button" variant="outline" mt="sm" onClick={revisarResultado}>Consultar cola</Button>}</Alert>}
        <Group justify="space-between"><Text size="sm" c="dimmed">{pagina ? `Última consulta: ${formatoInstante.format(new Date(pagina.consultadoEn))} · America/Lima` : 'Los indicadores corresponden a toda la cola, antes de aplicar filtros.'}</Text>
          <Button variant="subtle" type="button" size="sm" mih={44} disabled={consulta.cargando} leftSection={<IconRefresh size={20} aria-hidden="true" />} onClick={refrescar}>Actualizar</Button></Group>
        {nuevo && hayFiltros && <Text size="sm" role="status">El pedido de prueba se generó. Puede quedar fuera de los filtros o de la página actual.</Text>}
        <TablaCola pagina={pagina} estado={estado} nuevo={nuevo} bloqueada={bloqueada}
          alAsignar={(d) => { recordarFoco(); establecerAsignacion(d); }} alVerDetalle={(d) => { recordarFoco(); establecerDetalle(d); }}
          alCambiarPagina={(numero) => cambiar({ pagina: numero })} alCambiarTamano={(tamano) => cambiar({ tamanoPagina: tamano })}
          alGenerar={() => { void generar({}); }} alLimpiar={limpiar} alReintentar={refrescar} />
        {personalizada && <ModalSimulacion zonas={zonas} guardando={generando} error={errorSimulacion} alGenerar={generar}
          alCerrar={() => { if (!enCurso.current) { establecerPersonalizada(false); devolverFoco(); } }} alConsultar={revisarResultado} />}
        {asignacion && <ModalAsignacion despacho={asignacion} zonas={zonas} alCerrar={() => { establecerAsignacion(null); devolverFoco(); }} alActualizarCola={recargarCola} alDenegar={denegar} />}
        {detalle && <Modal opened title={`Detalle del despacho ${detalle.codigoOperativo}`} size={880} radius="lg"
          returnFocus={false} closeButtonProps={{ 'aria-label': 'Cerrar detalle' }}
          classNames={{ content: clases.modal, title: clases.tituloModal, header: clases.cabeceraModal, body: clases.cuerpoModal }} onClose={() => { establecerDetalle(null); devolverFoco(); }}><ResumenDespacho despacho={detalle} /></Modal>}
      </Stack>
    </EstadoVista>
  </Stack>;
}
