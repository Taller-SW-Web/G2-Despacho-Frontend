import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ActionIcon, Alert, Button, Group, Select, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { BarraFiltros, EncabezadoPagina, EstadoVista, ModalConfirmacion, TablaDatos, notificarOperacion } from '@despacho/componentes-compartidos';
import type { ColumnaDatos } from '@despacho/componentes-compartidos';
import { IconEdit, IconPlus, IconReceipt2, IconRefresh, IconToggleLeft, IconToggleRight } from '@tabler/icons-react';
import { useClienteApi } from '../../cliente/useClienteApi';
import { cambiarEstado, detalleProblema, listarZonas, problemaDe } from './api/zonasApi';
import { BadgeEstadoZona } from './BadgeEstadoZona';
import { useDistritos } from './useDistritos';
import type { EstadoConsulta, EstadoZona, PaginaZonas as ResultadoZonas, Zona } from './tipos';
import { formatearFecha, formatearMoneda } from './utilidades';

const TAMANO_PAGINA = 20;

export function PaginaZonas() {
  const cliente = useClienteApi();
  const navegar = useNavigate();
  const catalogo = useDistritos();
  const [parametros, setParametros] = useSearchParams();
  const nombre = parametros.get('nombre') ?? '';
  const distrito = parametros.get('distrito') ?? '';
  const estado: EstadoZona | 'TODOS' = parametros.get('estado') === 'ACTIVO' ? 'ACTIVO' : parametros.get('estado') === 'INACTIVO' ? 'INACTIVO' : 'TODOS';
  const paginaLeida = Number(parametros.get('pagina') ?? 1);
  const paginaActual = Number.isInteger(paginaLeida) && paginaLeida >= 1 ? paginaLeida : 1;
  const [busqueda, setBusqueda] = useState(nombre);
  const [consulta, setConsulta] = useState<EstadoConsulta>('cargando');
  const [resultado, setResultado] = useState<ResultadoZonas | null>(null);
  const [refresco, setRefresco] = useState(0);
  const [confirmacion, setConfirmacion] = useState<{ zona: Zona; nuevoEstado: EstadoZona } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | null>(null);

  useEffect(() => setBusqueda(nombre), [nombre]);
  useEffect(() => {
    const controlador = new AbortController();
    setConsulta('cargando');
    listarZonas(cliente, { nombre, distrito, estado, pagina: paginaActual, tamanoPagina: TAMANO_PAGINA }, controlador.signal)
      .then((pagina) => {
        if (controlador.signal.aborted) return;
        if (paginaActual > Math.max(1, pagina.totalPaginas)) {
          setParametros((actual) => { const siguientes = new URLSearchParams(actual); siguientes.delete('pagina'); return siguientes; }, { replace: true });
          return;
        }
        setResultado(pagina);
        setConsulta('datos');
      }).catch((fallo) => {
        if (controlador.signal.aborted) return;
        const status = problemaDe(fallo)?.status;
        setConsulta(status === 401 || status === 403 ? 'sinPermiso' : 'error');
        setResultado(null);
      });
    return () => controlador.abort();
  }, [cliente, nombre, distrito, estado, paginaActual, refresco, setParametros]);

  const actualizarFiltro = (clave: string, valor: string | null, reemplazar = false) => setParametros((actual) => {
    const siguientes = new URLSearchParams(actual);
    if (valor && (clave !== 'estado' || valor !== 'TODOS')) siguientes.set(clave, valor); else siguientes.delete(clave);
    if (clave !== 'pagina') siguientes.delete('pagina');
    return siguientes;
  }, { replace: reemplazar });
  const limpiar = () => { setBusqueda(''); setParametros({}); };
  const solicitarEstado = (zona: Zona, nuevoEstado: EstadoZona) => { setErrorConfirmacion(null); setConfirmacion({ zona, nuevoEstado }); };
  const confirmarEstado = async () => {
    if (!confirmacion || procesando) return;
    setProcesando(true);
    setErrorConfirmacion(null);
    try {
      await cambiarEstado(cliente, confirmacion.zona.id, confirmacion.nuevoEstado);
      notificarOperacion({ id: `zona-estado-${confirmacion.zona.id}`, tipo: 'exito',
        mensaje: `Zona «${confirmacion.zona.nombre}» ${confirmacion.nuevoEstado === 'ACTIVO' ? 'activada' : 'desactivada'} correctamente.` });
      setConfirmacion(null);
      setRefresco((valor) => valor + 1);
    } catch (fallo) {
      const status = problemaDe(fallo)?.status;
      if (status === 401 || status === 403) { setConfirmacion(null); setResultado(null); setConsulta('sinPermiso'); }
      else setErrorConfirmacion(detalleProblema(fallo, 'No se pudo cambiar el estado. Inténtalo de nuevo.'));
    } finally { setProcesando(false); }
  };

  if (consulta === 'sinPermiso' || catalogo.denegado) return <Stack gap="lg">
    <EncabezadoPagina titulo="Zonas de cobertura" subtitulo="Zonas desde el centro de despacho" />
    <EstadoVista estado="sinPermiso" />
  </Stack>;

  const filas = resultado?.contenido ?? [];
  const filtrosActivos = Boolean(nombre || distrito || estado !== 'TODOS');
  const activos = [
    ...(nombre ? [{ id: 'nombre', etiqueta: `Nombre: ${nombre}` }] : []),
    ...(distrito ? [{ id: 'distrito', etiqueta: `Distrito: ${distrito}` }] : []),
    ...(estado !== 'TODOS' ? [{ id: 'estado', etiqueta: `Estado: ${estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}` }] : []),
  ];
  const columnas: ColumnaDatos<Zona>[] = [
    { id: 'nombre', encabezado: 'Zona', celda: (zona) => <><Text fw={600}>{zona.nombre}</Text>
      {zona.estado === 'ACTIVO' && !zona.tarifaVigente && <Text size="xs" c="orange.8" fw={600}>Sin tarifa configurada</Text>}</> },
    { id: 'distritos', encabezado: 'Distritos', celda: (zona) => <Tooltip label={zona.distritos.map(({ nombre: n }) => n).join(', ')}>
      <Text size="sm">{zona.distritos.slice(0, 3).map(({ nombre: n }) => n).join(', ')}{zona.distritos.length > 3 ? ` +${zona.distritos.length - 3}` : ''}</Text></Tooltip> },
    { id: 'codigosPostales', encabezado: 'Códigos postales', celda: (zona) => zona.distritos.some(({ codigosPostales }) => codigosPostales.length > 0)
      ? zona.distritos.filter(({ codigosPostales }) => codigosPostales.length > 0).map((entrada) => <Text size="sm" key={entrada.id}>{entrada.nombre}: {entrada.codigosPostales.join(', ')}</Text>) : '—' },
    { id: 'tarifa', encabezado: 'Tarifa vigente', celda: (zona) => zona.tarifaVigente ? formatearMoneda(zona.tarifaVigente.tarifaBase, zona.tarifaVigente.moneda) : 'Sin tarifa' },
    { id: 'estado', encabezado: 'Estado', celda: (zona) => <BadgeEstadoZona estado={zona.estado} /> },
    { id: 'actualizadoEn', encabezado: 'Última modificación', celda: (zona) => formatearFecha(zona.actualizadoEn) },
  ];
  return <Stack gap="lg">
    <EncabezadoPagina titulo="Zonas de cobertura" subtitulo="Zonas desde el centro de despacho"
      acciones={<Group><Button variant="default" aria-label="Actualizar zonas" onClick={() => { setRefresco((valor) => valor + 1); catalogo.reintentar(); }} leftSection={<IconRefresh size={18} />}>Actualizar</Button>
        <Button leftSection={<IconPlus size={18} />} onClick={() => navegar('/zonas/nueva')}>Nueva zona</Button></Group>} />
    <BarraFiltros busqueda={busqueda} etiquetaBusqueda="Buscar por nombre" alCambiarBusqueda={setBusqueda}
      alConsultarBusqueda={(valor) => { if (valor.trim() !== nombre) actualizarFiltro('nombre', valor.trim(), true); }}
      activos={activos} consultando={consulta === 'cargando'} alLimpiar={limpiar}
      alQuitarFiltro={(clave) => { if (clave === 'nombre') setBusqueda(''); actualizarFiltro(clave, null); }}
      controles={<SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Select label="Distrito" placeholder="Todos los distritos" searchable clearable disabled={catalogo.cargando || Boolean(catalogo.error)}
        data={[...new Set([...catalogo.distritos.map(({ nombre: nombreDistrito }) => nombreDistrito), ...(distrito ? [distrito] : [])])]}
        value={distrito || null} onChange={(valor) => actualizarFiltro('distrito', valor)} nothingFoundMessage="No se encontraron distritos" />
      <Select label="Estado" data={[{ value: 'TODOS', label: 'Todos' }, { value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]}
        value={estado} allowDeselect={false} onChange={(valor) => actualizarFiltro('estado', valor)} />
      </SimpleGrid>} />
    {catalogo.error && <Alert color="yellow" title="Filtro de distrito no disponible"><Group><Text size="sm">{catalogo.error}</Text><Button size="xs" onClick={catalogo.reintentar}>Reintentar catálogo</Button></Group></Alert>}
    <TablaDatos filas={filas} obtenerId={(zona) => zona.id} columnas={columnas} tituloAccesible="Zonas de cobertura registradas"
      estado={consulta === 'error' ? 'error' : consulta === 'cargando' || !resultado ? 'carga' : filas.length ? 'datos' : filtrosActivos ? 'sinResultados' : 'vacio'}
      anchoMinimo={960} paginacion={{ pagina: resultado?.pagina ?? paginaActual, tamanioPagina: resultado?.tamanoPagina ?? TAMANO_PAGINA, total: resultado?.totalElementos ?? 0 }}
      alCambiarPagina={(valor) => actualizarFiltro('pagina', String(valor))}
      estiloFila={(zona) => zona.estado === 'INACTIVO' ? { background: 'var(--ia-color-surface-cloud-subtle)', color: 'var(--ia-color-text-secondary)' } : {}}
      renderizarEstado={(estadoVista) => estadoVista === 'error'
        ? <EstadoVista estado="error" titulo="No se pudieron cargar las zonas" descripcion="Revisa tu conexión e inténtalo de nuevo."
          accion={{ id: 'reintentar', etiqueta: 'Reintentar' }} alAccionar={() => setRefresco((valor) => valor + 1)} />
        : <EstadoVista estado={filtrosActivos ? 'sinResultados' : 'vacio'}
          titulo={filtrosActivos ? 'No hay zonas que coincidan con los filtros' : 'Aún no hay zonas de cobertura registradas'}
          descripcion={filtrosActivos ? 'Prueba con otros filtros o limpia la búsqueda.' : 'Crea una zona para configurar su cobertura y tarifa.'}
          accion={{ id: filtrosActivos ? 'limpiar' : 'crear', etiqueta: filtrosActivos ? 'Limpiar filtros' : 'Nueva zona' }}
          alAccionar={filtrosActivos ? limpiar : () => navegar('/zonas/nueva')} />}
      renderizarAcciones={(zona) => {
          const inactiva = zona.estado === 'INACTIVO';
          return <><Group gap="xs" wrap="nowrap">
              <Tooltip label="Editar zona"><ActionIcon variant="subtle" aria-label={`Editar ${zona.nombre}`} onClick={() => navegar(`/zonas/${zona.id}/editar`)}><IconEdit size={18} /></ActionIcon></Tooltip>
              <Tooltip label={inactiva ? 'Activa la zona para configurar su tarifa' : 'Configurar tarifas'}><span><ActionIcon variant="subtle" disabled={inactiva} aria-label={`Tarifas de ${zona.nombre}`} onClick={() => navegar(`/zonas/${zona.id}/tarifas${parametros.size ? `?${parametros}` : ''}`)}><IconReceipt2 size={18} /></ActionIcon></span></Tooltip>
              <Tooltip label={inactiva ? 'Activar zona' : 'Desactivar zona'}><ActionIcon variant="subtle" color={inactiva ? undefined : 'red'} aria-label={`${inactiva ? 'Activar' : 'Desactivar'} ${zona.nombre}`}
                onClick={() => solicitarEstado(zona, inactiva ? 'ACTIVO' : 'INACTIVO')}>{inactiva ? <IconToggleRight size={18} /> : <IconToggleLeft size={18} />}</ActionIcon></Tooltip>
            </Group>{inactiva && <Text size="xs" c="dimmed">Activa la zona para configurar su tarifa</Text>}</>;
      }} />
    <ModalConfirmacion abierto={Boolean(confirmacion)} titulo={`¿${confirmacion?.nuevoEstado === 'ACTIVO' ? 'Activar' : 'Desactivar'} la zona ${confirmacion?.zona.nombre ?? ''}?`}
      descripcion={confirmacion?.nuevoEstado === 'ACTIVO' ? 'La zona volverá a aceptar cotizaciones y solicitudes nuevas.' : 'La zona dejará de aceptar nuevas cotizaciones y nuevas solicitudes de despacho. Los despachos ya registrados conservarán su zona y continuarán su ciclo sin cambios, incluidas sus reprogramaciones.'}
      etiquetaConfirmar={confirmacion?.nuevoEstado === 'ACTIVO' ? 'Activar zona' : 'Desactivar zona'} intencion={confirmacion?.nuevoEstado === 'ACTIVO' ? 'principal' : 'destructiva'}
      procesando={procesando} error={errorConfirmacion ?? undefined} alConfirmar={() => void confirmarEstado()} alCancelar={() => { if (!procesando) setConfirmacion(null); }} />
  </Stack>;
}
