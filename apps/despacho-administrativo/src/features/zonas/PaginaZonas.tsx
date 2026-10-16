import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconEdit,
  IconLock,
  IconPlus,
  IconReceipt2,
  IconRefresh,
  IconSearch,
  IconToggleLeft,
  IconToggleRight,
} from '@tabler/icons-react';
import { useClienteApi } from '../../cliente/useClienteApi';
import { cambiarEstado, listarZonas, problemaDe } from './api/zonasApi';
import { BadgeEstadoZona } from './BadgeEstadoZona';
import { ModalConfirmacion } from './ModalConfirmacion';
import type { EstadoConsulta, EstadoZona, PaginaZonas, Zona } from './tipos';
import { formatearFecha, formatearMoneda } from './utilidades';

const TAMANO_PAGINA = 20;
const RETARDO_CONSULTA = 300;

const OPCIONES_ESTADO = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

function distritosResumen(zona: Zona): string {
  if (zona.distritos.length === 0) return '—';
  const visibles = zona.distritos.slice(0, 3).map((distrito) => distrito.nombre);
  const restantes = zona.distritos.length - visibles.length;
  return restantes > 0 ? `${visibles.join(', ')} +${restantes}` : visibles.join(', ');
}

export function PaginaZonas() {
  const cliente = useClienteApi();
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();

  const [nombre, setNombre] = useState(() => parametros.get('nombre') ?? '');
  const [distrito, setDistrito] = useState(() => parametros.get('distrito') ?? '');
  const [estado, setEstado] = useState<EstadoZona | 'TODOS'>(
    () => (parametros.get('estado') as EstadoZona | null) ?? 'TODOS',
  );
  const [paginaActual, setPaginaActual] = useState(() => {
    const valor = Number(parametros.get('pagina') ?? '1');
    return Number.isFinite(valor) && valor >= 1 ? valor : 1;
  });

  const [consulta, setConsulta] = useState<EstadoConsulta>('cargando');
  const [resultado, setResultado] = useState<PaginaZonas | null>(null);
  const [refresco, setRefresco] = useState(0);
  const consultaId = useRef(0);

  const [confirmacion, setConfirmacion] = useState<{ zona: Zona; nuevoEstado: EstadoZona } | null>(
    null,
  );
  const [procesandoConfirmacion, setProcesandoConfirmacion] = useState(false);
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | null>(null);

  const limpiarFiltros = useCallback(() => {
    setNombre('');
    setDistrito('');
    setEstado('TODOS');
    setPaginaActual(1);
  }, []);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      const siguientes = new URLSearchParams();
      if (nombre.trim()) siguientes.set('nombre', nombre.trim());
      if (distrito.trim()) siguientes.set('distrito', distrito.trim());
      if (estado !== 'TODOS') siguientes.set('estado', estado);
      if (paginaActual > 1) siguientes.set('pagina', String(paginaActual));
      setParametros(siguientes, { replace: true });
    }, RETARDO_CONSULTA);
    return () => clearTimeout(temporizador);
  }, [nombre, distrito, estado, paginaActual, setParametros]);

  useEffect(() => {
    const id = consultaId.current + 1;
    consultaId.current = id;
    setConsulta((actual) => (actual === 'datos' || actual === 'actualizando' ? 'actualizando' : 'cargando'));

    listarZonas(cliente, { nombre, distrito, estado, pagina: paginaActual, tamanoPagina: TAMANO_PAGINA })
      .then((pagina) => {
        if (consultaId.current !== id) return;
        setResultado(pagina);
        setConsulta('datos');
      })
      .catch((error) => {
        if (consultaId.current !== id) return;
        const problema = problemaDe(error);
        if (problema?.status === 401 || problema?.status === 403) {
          setConsulta('sinPermiso');
          setResultado(null);
          return;
        }
        setConsulta('error');
      });
  }, [cliente, nombre, distrito, estado, paginaActual, refresco]);

  const cambiarPagina = (pagina: number) => {
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reintentar = () => setRefresco((valor) => valor + 1);

  const solicitarDesactivacion = (zona: Zona) => {
    setErrorConfirmacion(null);
    setConfirmacion({ zona, nuevoEstado: 'INACTIVO' });
  };

  const activarZona = async (zona: Zona) => {
    try {
      await cambiarEstado(cliente, zona.id, 'ACTIVO');
      notifications.show({
        message: `La zona «${zona.nombre}» volverá a aceptar cotizaciones y solicitudes nuevas.`,
        color: 'teal',
        title: 'Zona activada',
      });
      reintentar();
    } catch (error) {
      const problema = problemaDe(error);
      if (problema?.status === 401 || problema?.status === 403) {
        setConsulta('sinPermiso');
        setResultado(null);
        return;
      }
      notifications.show({
        message: problema?.detail ?? 'No se pudo activar la zona. Inténtalo de nuevo.',
        color: 'red',
        title: 'No se pudo activar',
      });
    }
  };

  const confirmarDesactivacion = async () => {
    if (!confirmacion) return;
    setProcesandoConfirmacion(true);
    setErrorConfirmacion(null);
    try {
      await cambiarEstado(cliente, confirmacion.zona.id, 'INACTIVO');
      notifications.show({
        message: `Los despachos ya registrados en «${confirmacion.zona.nombre}» conservan su zona.`,
        color: 'teal',
        title: 'Zona desactivada',
      });
      setConfirmacion(null);
      reintentar();
    } catch (error) {
      const problema = problemaDe(error);
      if (problema?.status === 401 || problema?.status === 403) {
        setConfirmacion(null);
        setConsulta('sinPermiso');
        setResultado(null);
        return;
      }
      setErrorConfirmacion(
        problema?.detail ?? 'No se pudo desactivar la zona. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      setProcesandoConfirmacion(false);
    }
  };

  if (consulta === 'sinPermiso') {
    return (
      <Stack gap="md" maw={720}>
        <Title order={1}>Zonas de cobertura</Title>
        <Alert
          color="red"
          variant="light"
          icon={<IconLock size={18} />}
          title="No tienes permisos para ver la configuración de zonas"
        >
          Solicita acceso al rol GESTOR_DESPACHO para consultar y configurar zonas y tarifas.
        </Alert>
      </Stack>
    );
  }

  const filtrosActivos = nombre.trim() !== '' || distrito.trim() !== '' || estado !== 'TODOS';
  const filas = resultado?.contenido ?? [];
  const desde = resultado && filas.length > 0 ? (resultado.pagina - 1) * resultado.tamanoPagina + 1 : 0;
  const hasta = resultado ? desde + filas.length - 1 : 0;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={2}>
          <Text size="sm" c="dimmed">
            Zonas desde el centro de despacho
          </Text>
          <Title order={1}>Zonas de cobertura</Title>
        </Stack>
        <Button leftSection={<IconPlus size={18} />} onClick={() => navegar('/zonas/nueva')}>
          Nueva zona
        </Button>
      </Group>

      <Card>
        <Group gap="md" align="flex-end" wrap="wrap">
          <TextInput
            label="Buscar por nombre"
            placeholder="Lima Centro"
            leftSection={<IconSearch size={16} />}
            value={nombre}
            onChange={(evento) => {
              setNombre(evento.currentTarget.value);
              setPaginaActual(1);
            }}
            w={260}
          />
          <TextInput
            label="Distrito"
            placeholder="Nombre exacto del distrito"
            value={distrito}
            onChange={(evento) => {
              setDistrito(evento.currentTarget.value);
              setPaginaActual(1);
            }}
            w={220}
          />
          <Select
            label="Estado"
            data={OPCIONES_ESTADO}
            value={estado}
            allowDeselect={false}
            onChange={(valor) => {
              setEstado((valor as EstadoZona | 'TODOS') ?? 'TODOS');
              setPaginaActual(1);
            }}
            w={160}
          />
          <Button
            variant="subtle"
            disabled={!filtrosActivos}
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </Button>
        </Group>
      </Card>

      {consulta === 'error' ? (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title="No se pudieron cargar las zonas"
        >
          <Stack gap="sm" align="flex-start">
            <Text size="sm">Revisa tu conexión e inténtalo de nuevo.</Text>
            <Button size="xs" leftSection={<IconRefresh size={16} />} onClick={reintentar}>
              Reintentar
            </Button>
          </Stack>
        </Alert>
      ) : consulta === 'cargando' || !resultado ? (
        <Card>
          <Stack gap="xs">
            {Array.from({ length: 5 }).map((_, indice) => (
              <Skeleton key={indice} height={44} radius="sm" />
            ))}
          </Stack>
        </Card>
      ) : filas.length === 0 ? (
        <Card>
          <Stack align="center" gap="sm" py="xl">
            <ThemeIcon color="gray" variant="light" size={44} radius="xl">
              <IconSearch size={22} />
            </ThemeIcon>
            {filtrosActivos ? (
              <>
                <Text fw={600}>No hay zonas que coincidan con los filtros</Text>
                <Button variant="subtle" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              </>
            ) : (
              <>
                <Text fw={600}>Aún no hay zonas de cobertura registradas</Text>
                <Button leftSection={<IconPlus size={18} />} onClick={() => navegar('/zonas/nueva')}>
                  Nueva zona
                </Button>
              </>
            )}
          </Stack>
        </Card>
      ) : (
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <Table.ScrollContainer minWidth={960}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md" tabularNums>
              <Table.Caption>Zonas de cobertura registradas</Table.Caption>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Zona</Table.Th>
                  <Table.Th>Distritos</Table.Th>
                  <Table.Th>Códigos postales</Table.Th>
                  <Table.Th>Tarifa vigente</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Última modificación</Table.Th>
                  <Table.Th ta="right">Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filas.map((zona) => {
                  const inactiva = zona.estado === 'INACTIVO';
                  const sinTarifa = zona.estado === 'ACTIVO' && !zona.tarifaVigente;
                  return (
                    <Table.Tr key={zona.id}>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text fw={600}>{zona.nombre}</Text>
                          {sinTarifa ? (
                            <Text size="xs" c="orange.8" fw={600}>
                              Sin tarifa configurada
                            </Text>
                          ) : null}
                        </Stack>
                      </Table.Td>
                      <Table.Td>{distritosResumen(zona)}</Table.Td>
                      <Table.Td>
                        {zona.codigosPostales.length > 0 ? zona.codigosPostales.join(', ') : '—'}
                      </Table.Td>
                      <Table.Td>
                        {zona.tarifaVigente
                          ? formatearMoneda(zona.tarifaVigente.tarifaBase, zona.tarifaVigente.moneda)
                          : 'Sin tarifa'}
                      </Table.Td>
                      <Table.Td>
                        <BadgeEstadoZona estado={zona.estado} />
                      </Table.Td>
                      <Table.Td>{formatearFecha(zona.actualizadoEn)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          <Tooltip label="Editar zona">
                            <ActionIcon
                              variant="subtle"
                              aria-label={`Editar ${zona.nombre}`}
                              onClick={() => navegar(`/zonas/${zona.id}/editar`)}
                            >
                              <IconEdit size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip
                            label={
                              inactiva
                                ? 'Activa la zona para configurar su tarifa'
                                : 'Configurar tarifas'
                            }
                          >
                            <span>
                              <ActionIcon
                                variant="subtle"
                                disabled={inactiva}
                                aria-label={`Tarifas de ${zona.nombre}`}
                                aria-describedby={inactiva ? `motivo-tarifa-${zona.id}` : undefined}
                                onClick={() => navegar(`/zonas/${zona.id}/tarifas`)}
                              >
                                <IconReceipt2 size={18} />
                              </ActionIcon>
                            </span>
                          </Tooltip>
                          {inactiva ? (
                            <Tooltip label="Activar zona">
                              <ActionIcon
                                variant="subtle"
                                color="teal"
                                aria-label={`Activar ${zona.nombre}`}
                                onClick={() => void activarZona(zona)}
                              >
                                <IconToggleRight size={18} />
                              </ActionIcon>
                            </Tooltip>
                          ) : (
                            <Tooltip label="Desactivar zona">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                aria-label={`Desactivar ${zona.nombre}`}
                                onClick={() => solicitarDesactivacion(zona)}
                              >
                                <IconToggleLeft size={18} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Group justify="space-between" px="md" py="sm">
            <Text size="sm" c="dimmed">
              Mostrando {desde}–{hasta} de {resultado.totalElementos}
            </Text>
            {resultado.totalPaginas > 1 ? (
              <Pagination
                total={resultado.totalPaginas}
                value={resultado.pagina}
                onChange={cambiarPagina}
                size="sm"
              />
            ) : null}
          </Group>
        </Card>
      )}

      <ModalConfirmacion
        abierto={confirmacion !== null}
        titulo={`¿Desactivar la zona ${confirmacion?.zona.nombre ?? ''}?`}
        descripcion="La zona dejará de aceptar nuevas cotizaciones y nuevas solicitudes de despacho. Los despachos ya registrados en esta zona conservarán su zona y continuarán su ciclo sin cambios, incluidas sus reprogramaciones."
        etiquetaConfirmar="Desactivar zona"
        intencion="destructiva"
        procesando={procesandoConfirmacion}
        error={errorConfirmacion}
        alConfirmar={() => void confirmarDesactivacion()}
        alCancelar={() => {
          if (procesandoConfirmacion) return;
          setConfirmacion(null);
          setErrorConfirmacion(null);
        }}
      />
    </Stack>
  );
}
