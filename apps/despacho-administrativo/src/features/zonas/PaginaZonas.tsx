import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ActionIcon, Alert, Button, Card, Group, Pagination, Select, Skeleton, Stack, Table, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { EncabezadoPagina } from '@despacho/componentes-compartidos';
import { IconEdit, IconPlus, IconReceipt2, IconRefresh, IconSearch, IconToggleLeft, IconToggleRight } from '@tabler/icons-react';
import { useClienteApi } from '../../cliente/useClienteApi';
import { cambiarEstado, detalleProblema, listarZonas, problemaDe } from './api/zonasApi';
import { BadgeEstadoZona } from './BadgeEstadoZona';
import { ModalConfirmacion } from './ModalConfirmacion';
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
    if (busqueda.trim() === nombre) return;
    const temporizador = setTimeout(() => setParametros((actual) => {
      const siguientes = new URLSearchParams(actual);
      if (busqueda.trim()) siguientes.set('nombre', busqueda.trim()); else siguientes.delete('nombre');
      siguientes.delete('pagina');
      return siguientes;
    }, { replace: true }), 300);
    return () => clearTimeout(temporizador);
  }, [busqueda, nombre, setParametros]);

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

  const actualizarFiltro = (clave: string, valor: string | null) => setParametros((actual) => {
    const siguientes = new URLSearchParams(actual);
    if (valor && valor !== 'TODOS') siguientes.set(clave, valor); else siguientes.delete(clave);
    if (clave !== 'pagina') siguientes.delete('pagina');
    return siguientes;
  });
  const limpiar = () => { setBusqueda(''); setParametros({}); };
  const solicitarEstado = (zona: Zona, nuevoEstado: EstadoZona) => { setErrorConfirmacion(null); setConfirmacion({ zona, nuevoEstado }); };
  const confirmarEstado = async () => {
    if (!confirmacion || procesando) return;
    setProcesando(true);
    setErrorConfirmacion(null);
    try {
      await cambiarEstado(cliente, confirmacion.zona.id, confirmacion.nuevoEstado);
      notifications.show({ title: confirmacion.nuevoEstado === 'ACTIVO' ? 'Zona activada' : 'Zona desactivada',
        message: `Estado de «${confirmacion.zona.nombre}» actualizado correctamente.`, color: 'teal' });
      setConfirmacion(null);
      setRefresco((valor) => valor + 1);
    } catch (fallo) {
      const status = problemaDe(fallo)?.status;
      if (status === 401 || status === 403) { setConfirmacion(null); setResultado(null); setConsulta('sinPermiso'); }
      else setErrorConfirmacion(detalleProblema(fallo, 'No se pudo cambiar el estado. Inténtalo de nuevo.'));
    } finally { setProcesando(false); }
  };

  if (consulta === 'sinPermiso' || catalogo.denegado) return <Stack maw={720}><Title order={1}>Zonas de cobertura</Title>
    <Alert color="red" title="No tienes permisos para ver la configuración de zonas">Necesitas una sesión vigente con rol GESTOR_DESPACHO.</Alert></Stack>;

  const filas = resultado?.contenido ?? [];
  const filtrosActivos = Boolean(nombre || distrito || estado !== 'TODOS');
  const desde = filas.length && resultado ? (resultado.pagina - 1) * resultado.tamanoPagina + 1 : 0;
  const hasta = filas.length ? desde + filas.length - 1 : 0;
  return <Stack gap="lg">
    <EncabezadoPagina titulo="Zonas de cobertura" subtitulo="Zonas desde el centro de despacho"
      acciones={<Group><Button variant="default" aria-label="Actualizar zonas" onClick={() => { setRefresco((valor) => valor + 1); catalogo.reintentar(); }} leftSection={<IconRefresh size={18} />}>Actualizar</Button>
        <Button leftSection={<IconPlus size={18} />} onClick={() => navegar('/zonas/nueva')}>Nueva zona</Button></Group>} />
    <Card><Group align="flex-end" gap="md">
      <TextInput label="Buscar por nombre" placeholder="Lima Centro" leftSection={<IconSearch size={16} />} value={busqueda} onChange={(evento) => setBusqueda(evento.currentTarget.value)} style={{ flex: '1 1 220px' }} />
      <Select label="Distrito" placeholder="Todos los distritos" searchable clearable disabled={catalogo.cargando || Boolean(catalogo.error)}
        data={[...new Set([...catalogo.distritos.map(({ nombre: nombreDistrito }) => nombreDistrito), ...(distrito ? [distrito] : [])])]}
        value={distrito || null} onChange={(valor) => actualizarFiltro('distrito', valor)} nothingFoundMessage="No se encontraron distritos" style={{ flex: '1 1 220px' }} />
      <Select label="Estado" data={[{ value: 'TODOS', label: 'Todos' }, { value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]}
        value={estado} allowDeselect={false} onChange={(valor) => actualizarFiltro('estado', valor)} w={160} />
      <Button variant="subtle" disabled={!filtrosActivos && !busqueda} onClick={limpiar}>Limpiar filtros</Button>
    </Group></Card>
    {catalogo.error && <Alert color="orange" title="Filtro de distrito no disponible"><Group><Text size="sm">{catalogo.error}</Text><Button size="xs" onClick={catalogo.reintentar}>Reintentar catálogo</Button></Group></Alert>}
    {consulta === 'error' ? <Alert color="red" title="No se pudieron cargar las zonas"><Stack align="flex-start"><Text size="sm">Revisa tu conexión e inténtalo de nuevo.</Text><Button onClick={() => setRefresco((valor) => valor + 1)}>Reintentar</Button></Stack></Alert>
      : consulta === 'cargando' || !resultado ? <Card aria-label="Cargando zonas"><Stack>{[0, 1, 2, 3, 4].map((indice) => <Skeleton key={indice} height={44} />)}</Stack></Card>
      : filas.length === 0 ? <Card><Stack align="center" py="xl"><Text fw={600}>{filtrosActivos ? 'No hay zonas que coincidan con los filtros' : 'Aún no hay zonas de cobertura registradas'}</Text>
        <Button variant="light" onClick={filtrosActivos ? limpiar : () => navegar('/zonas/nueva')}>{filtrosActivos ? 'Limpiar filtros' : 'Nueva zona'}</Button></Stack></Card>
      : <Card padding={0}><Table.ScrollContainer minWidth={960}><Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
        <Table.Caption>Zonas de cobertura registradas</Table.Caption><Table.Thead><Table.Tr>
          {['Zona', 'Distritos', 'Códigos postales', 'Tarifa vigente', 'Estado', 'Última modificación', 'Acciones'].map((columna) => <Table.Th key={columna}>{columna}</Table.Th>)}
        </Table.Tr></Table.Thead><Table.Tbody>{filas.map((zona) => {
          const inactiva = zona.estado === 'INACTIVO';
          return <Table.Tr key={zona.id} style={inactiva ? { background: 'var(--mantine-color-gray-0)' } : undefined}>
            <Table.Td><Text fw={600}>{zona.nombre}</Text>{!inactiva && !zona.tarifaVigente && <Text size="xs" c="orange.8" fw={600}>Sin tarifa configurada</Text>}</Table.Td>
            <Table.Td><Tooltip label={zona.distritos.map(({ nombre: n }) => n).join(', ')}><Text size="sm">{zona.distritos.slice(0, 3).map(({ nombre: n }) => n).join(', ')}{zona.distritos.length > 3 ? ` +${zona.distritos.length - 3}` : ''}</Text></Tooltip></Table.Td>
            <Table.Td>{zona.distritos.some(({ codigosPostales }) => codigosPostales.length > 0) ? zona.distritos.filter(({ codigosPostales }) => codigosPostales.length > 0).map((entrada) => <Text size="sm" key={entrada.id}>{entrada.nombre}: {entrada.codigosPostales.join(', ')}</Text>) : '—'}</Table.Td>
            <Table.Td>{zona.tarifaVigente ? formatearMoneda(zona.tarifaVigente.tarifaBase, zona.tarifaVigente.moneda) : 'Sin tarifa'}</Table.Td>
            <Table.Td><BadgeEstadoZona estado={zona.estado} /></Table.Td><Table.Td>{formatearFecha(zona.actualizadoEn)}</Table.Td>
            <Table.Td><Group gap="xs" wrap="nowrap">
              <Tooltip label="Editar zona"><ActionIcon variant="subtle" aria-label={`Editar ${zona.nombre}`} onClick={() => navegar(`/zonas/${zona.id}/editar`)}><IconEdit size={18} /></ActionIcon></Tooltip>
              <Tooltip label={inactiva ? 'Activa la zona para configurar su tarifa' : 'Configurar tarifas'}><span><ActionIcon variant="subtle" disabled={inactiva} aria-label={`Tarifas de ${zona.nombre}`} onClick={() => navegar(`/zonas/${zona.id}/tarifas${parametros.size ? `?${parametros}` : ''}`)}><IconReceipt2 size={18} /></ActionIcon></span></Tooltip>
              <Tooltip label={inactiva ? 'Activar zona' : 'Desactivar zona'}><ActionIcon variant="subtle" color={inactiva ? 'teal' : 'red'} aria-label={`${inactiva ? 'Activar' : 'Desactivar'} ${zona.nombre}`}
                onClick={() => solicitarEstado(zona, inactiva ? 'ACTIVO' : 'INACTIVO')}>{inactiva ? <IconToggleRight size={18} /> : <IconToggleLeft size={18} />}</ActionIcon></Tooltip>
            </Group>{inactiva && <Text size="xs" c="dimmed">Activa la zona para configurar su tarifa</Text>}</Table.Td>
          </Table.Tr>;
        })}</Table.Tbody></Table></Table.ScrollContainer>
        <Group justify="space-between" p="md"><Text size="sm" c="dimmed">Mostrando {desde}–{hasta} de {resultado.totalElementos}</Text>
          {resultado.totalPaginas > 1 && <Pagination total={resultado.totalPaginas} value={resultado.pagina} onChange={(valor) => actualizarFiltro('pagina', String(valor))} />}</Group>
      </Card>}
    <ModalConfirmacion abierto={Boolean(confirmacion)} titulo={`¿${confirmacion?.nuevoEstado === 'ACTIVO' ? 'Activar' : 'Desactivar'} la zona ${confirmacion?.zona.nombre ?? ''}?`}
      descripcion={confirmacion?.nuevoEstado === 'ACTIVO' ? 'La zona volverá a aceptar cotizaciones y solicitudes nuevas.' : 'La zona dejará de aceptar nuevas cotizaciones y nuevas solicitudes de despacho. Los despachos ya registrados conservarán su zona y continuarán su ciclo sin cambios, incluidas sus reprogramaciones.'}
      etiquetaConfirmar={confirmacion?.nuevoEstado === 'ACTIVO' ? 'Activar zona' : 'Desactivar zona'} intencion={confirmacion?.nuevoEstado === 'ACTIVO' ? 'principal' : 'destructiva'}
      procesando={procesando} error={errorConfirmacion} alConfirmar={() => void confirmarEstado()} alCancelar={() => { if (!procesando) setConfirmacion(null); }} />
  </Stack>;
}
