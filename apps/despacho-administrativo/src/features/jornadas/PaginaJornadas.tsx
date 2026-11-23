import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Group, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import {
  IconAlertOctagon,
  IconCircleCheck,
  IconClockHour4,
  IconMoon,
  IconPlus,
  IconRefresh,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import 'dayjs/locale/es';
import { useSearchParams } from 'react-router-dom';
import {
  BadgeEstado,
  BarraFiltros,
  EncabezadoPagina,
  EstadoVista,
  FranjaEstado,
  TablaDatos,
  TarjetaKpi,
  type ColumnaDatos,
} from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarMonitoreo, listarZonas } from './api';
import {
  estadosOperativos,
  fechaBogota,
  validarParametros,
  type FilaMonitoreo,
  type Jornada,
} from './modelo';
import { useConsultaJornadas } from './useConsultaJornadas';
import { FormularioJornada } from './FormularioJornada';
import { ConfirmarCierreJornada } from './ConfirmarCierreJornada';
import { DetalleJornada } from './DetalleJornada';
import { MetricasJornada } from './MetricasJornada';
import { useVersionSesion } from '../../sesion/useVersionSesion';
import clases from './Monitoreo.module.css';

const etiquetas = {
  DISPONIBLE: 'Disponible',
  EN_RUTA: 'En ruta',
  SATURADO: 'Saturado',
  FUERA_DE_TURNO: 'Fuera de turno',
};
const kpis = [
  {
    id: 'DISPONIBLE',
    etiqueta: 'Disponibles',
    clave: 'disponible',
    tono: 'availability',
    Icono: IconCircleCheck,
  },
  { id: 'EN_RUTA', etiqueta: 'En ruta', clave: 'enRuta', tono: 'info', Icono: IconTruckDelivery },
  {
    id: 'SATURADO',
    etiqueta: 'Saturados',
    clave: 'saturado',
    tono: 'error',
    Icono: IconAlertOctagon,
  },
  {
    id: 'FUERA_DE_TURNO',
    etiqueta: 'Fuera de turno',
    clave: 'fueraDeTurno',
    tono: 'neutral',
    Icono: IconMoon,
  },
] as const;
// §5.5: fechas dd/mm/aaaa y horas de 24 h, en la zona horaria de Operación.
const fechaHora = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
type Seleccion =
  { tipo: 'abrir' } | { tipo: 'cerrar'; jornada: Jornada } | { tipo: 'detalle'; id: string };
export function PaginaJornadas() {
  const sesion = useVersionSesion();
  return <PanelJornadas key={sesion} />;
}

function PanelJornadas() {
  const cliente = useClienteApi();
  const [parametros, establecerParametros] = useSearchParams();
  const clave = parametros.toString(),
    errores = validarParametros(parametros);
  const cargar = useCallback(
    (signal: AbortSignal) => consultarMonitoreo(cliente, new URLSearchParams(clave), signal),
    [cliente, clave],
  );
  const consulta = useConsultaJornadas(cargar, !errores.length, 30000);
  // Los nombres de zona solo se piden después de una consulta válida del tablero.
  const cargarZonas = useCallback((signal: AbortSignal) => listarZonas(cliente, signal), [cliente]);
  const zonas = useConsultaJornadas(cargarZonas, Boolean(consulta.datos) && !errores.length);
  const [seleccion, seleccionar] = useState<Seleccion | null>(null);
  const [sinConexion, sinConectar] = useState(!navigator.onLine);
  useEffect(() => {
    const conectar = () => {
        sinConectar(false);
        consulta.actualizar();
      },
      desconectar = () => sinConectar(true);
    window.addEventListener('online', conectar);
    window.addEventListener('offline', desconectar);
    return () => {
      window.removeEventListener('online', conectar);
      window.removeEventListener('offline', desconectar);
    };
  }, [consulta.actualizar]);
  useEffect(() => {
    if (consulta.denegado) seleccionar(null);
  }, [consulta.denegado]);
  const cambiar = (cambios: Record<string, string>) => {
    const siguientes = new URLSearchParams(parametros);
    if (!('pagina' in cambios)) siguientes.set('pagina', '1');
    Object.entries(cambios).forEach(([k, v]) => {
      if (v) siguientes.set(k, v);
      else siguientes.delete(k);
    });
    establecerParametros(siguientes);
  };
  const datos = consulta.datos;
  useEffect(() => {
    if (consulta.confirmada && datos && datos.pagina > Math.max(1, datos.totalPaginas)) {
      const siguientes = new URLSearchParams(clave);
      siguientes.set('pagina', String(Math.max(1, datos.totalPaginas)));
      establecerParametros(siguientes, { replace: true });
    }
  }, [consulta.confirmada, datos, clave, establecerParametros]);
  const habilitada = consulta.confirmada && !errores.length && !sinConexion && !consulta.denegado;
  const nombreZona = (id: string) =>
    zonas.datos?.find(({ value }) => value === id)?.label ?? `Zona ${id}`;
  // Sin datos confirmados no se muestran indicadores ni tabla vacíos: solo el error y su acción.
  const sinDatos = !datos && (Boolean(consulta.error) || errores.length > 0);
  const filtrosActivos = ['fecha', 'estadoOperativo', 'idZona'].some((id) => parametros.has(id));
  const idZona = parametros.get('idZona');
  const opcionesZona =
    idZona && !zonas.datos?.some(({ value }) => value === idZona)
      ? [...(zonas.datos ?? []), { value: idZona, label: `Zona ${idZona}` }]
      : (zonas.datos ?? []);
  const etiquetaFiltro = (id: string, valor: string) =>
    id === 'fecha'
      ? `Fecha: ${valor.split('-').reverse().join('/')}`
      : id === 'idZona'
        ? `Zona: ${nombreZona(valor)}`
        : `Estado: ${etiquetas[valor as keyof typeof etiquetas] ?? 'Estado no disponible'}`;
  const cerrar = () => {
    seleccionar(null);
    consulta.actualizar();
  };
  const columnas: ColumnaDatos<FilaMonitoreo>[] = [
    {
      id: 'nombre',
      encabezado: 'Repartidor',
      celda: (fila) => (
        <Text size="sm" fw={600} className={clases.repartidor}>
          {fila.nombre}
        </Text>
      ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      celda: (fila) => <BadgeEstado contexto="operacionRepartidor" valor={fila.estadoOperativo} />,
    },
    {
      id: 'vehiculo',
      encabezado: 'Furgoneta y zona',
      celda: (fila) =>
        fila.jornada ? (
          <Stack gap={2}>
            <Text size="sm" fw={600} className={clases.placa}>
              {fila.jornada.placa}
            </Text>
            <Text size="xs" className={clases.zona}>
              {nombreZona(fila.jornada.idZona)}
            </Text>
          </Stack>
        ) : (
          <span className={clases.sinDato}>Sin jornada</span>
        ),
    },
    {
      id: 'ocupacion',
      encabezado: 'Ocupación confirmada',
      celda: (fila) =>
        fila.jornada ? (
          <div className={clases.ocupacion}>
            <MetricasJornada jornada={fila.jornada} compacta />
          </div>
        ) : (
          <span className={clases.sinDato}>Sin jornada activa</span>
        ),
    },
    {
      id: 'acciones',
      encabezado: 'Acciones',
      celda: (fila) =>
        fila.jornada && (
          <Stack gap={0} align="flex-start" className={clases.acciones}>
            <Button
              type="button"
              variant="subtle"
              size="sm"
              mih={44}
              disabled={!habilitada}
              onClick={() => seleccionar({ tipo: 'detalle', id: fila.jornada!.idJornada })}
              aria-label={`Ver jornada de ${fila.nombre}`}
            >
              Ver detalle
            </Button>
            <Button
              type="button"
              variant="subtle"
              color="red"
              size="sm"
              mih={44}
              disabled={
                !habilitada ||
                fila.jornada.estado !== 'ACTIVA' ||
                !estadosOperativos.includes(
                  fila.estadoOperativo as (typeof estadosOperativos)[number],
                )
              }
              onClick={() => seleccionar({ tipo: 'cerrar', jornada: fila.jornada! })}
              aria-label={`Cerrar jornada de ${fila.nombre}`}
            >
              Cerrar jornada
            </Button>
          </Stack>
        ),
    },
  ];
  if (consulta.denegado)
    return <EstadoVista estado="sinPermiso" alAccionar={consulta.reintentarAcceso} />;
  return (
    <Stack gap="lg" style={{ minWidth: 0 }}>
      <EncabezadoPagina
        titulo="Jornadas y monitoreo"
        subtitulo="Asigna recursos y supervisa la ocupación confirmada de la flota."
        acciones={
          <Group>
            <Button
              variant="default"
              type="button"
              mih={44}
              leftSection={<IconRefresh size={20} aria-hidden="true" />}
              disabled={consulta.cargando}
              onClick={consulta.actualizar}
            >
              Actualizar
            </Button>
            <Button
              type="button"
              mih={44}
              leftSection={<IconPlus size={20} aria-hidden="true" />}
              disabled={!habilitada}
              onClick={() => seleccionar({ tipo: 'abrir' })}
            >
              Abrir jornada
            </Button>
          </Group>
        }
      />
      <EstadoVista estado="datos">
        <Stack gap="lg">
          <BarraFiltros
            consultando={consulta.cargando}
            alLimpiar={() => establecerParametros({})}
            alQuitarFiltro={(id) => cambiar({ [id]: '' })}
            activos={['fecha', 'estadoOperativo', 'idZona']
              .filter((id) => parametros.has(id))
              .map((id) => ({ id, etiqueta: etiquetaFiltro(id, parametros.get(id) ?? '') }))}
            controles={
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                <DatePickerInput
                  label="Fecha de consulta"
                  placeholder="Hoy"
                  size="md"
                  locale="es"
                  valueFormat="DD/MM/YYYY"
                  clearable
                  clearButtonProps={{ 'aria-label': 'Limpiar fecha de consulta' }}
                  nextLabel="Mes siguiente"
                  previousLabel="Mes anterior"
                  value={parametros.get('fecha') || null}
                  onChange={(valor) => cambiar({ fecha: valor ?? '' })}
                />
                <Select
                  label="Estado operativo"
                  placeholder="Todos"
                  clearable
                  value={parametros.get('estadoOperativo')}
                  data={estadosOperativos.map((id) => ({ value: id, label: etiquetas[id] }))}
                  onChange={(v) => cambiar({ estadoOperativo: v ?? '' })}
                />
                {zonas.error ? (
                  <TextInput
                    label="Identificador de zona"
                    description="No pudimos cargar los nombres de las zonas."
                    value={parametros.get('idZona') ?? ''}
                    onChange={(e) => cambiar({ idZona: e.currentTarget.value })}
                  />
                ) : (
                  <Select
                    label="Zona"
                    placeholder="Todas"
                    searchable
                    clearable
                    value={parametros.get('idZona')}
                    data={opcionesZona}
                    onChange={(v) => cambiar({ idZona: v ?? '' })}
                  />
                )}
              </SimpleGrid>
            }
          />
          {errores.length > 0 && (
            <Alert role="alert" title="Revisa los filtros" color="red" variant="light">
              <Stack gap="sm" align="flex-start">
                <Text>{errores.join(' ')}</Text>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  mih={44}
                  onClick={() => establecerParametros({})}
                >
                  Restablecer filtros
                </Button>
              </Stack>
            </Alert>
          )}
          {sinConexion && <FranjaEstado tipo="sinConexion" />}
          {datos && !consulta.confirmada && (
            <FranjaEstado
              tipo="datosDesactualizados"
              accion={{
                id: 'actualizar',
                etiqueta: 'Actualizar datos',
                disabled: consulta.cargando,
              }}
              alAccionar={consulta.actualizar}
            />
          )}
          {sinDatos ? (
            !errores.length && (
              <EstadoVista
                estado="error"
                descripcion={consulta.error}
                accion={{ id: 'reintentar', etiqueta: 'Reintentar consulta' }}
                alAccionar={consulta.actualizar}
              />
            )
          ) : (
            <>
              <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
                {kpis.map(({ Icono, ...kpi }) => (
                  <TarjetaKpi
                    key={kpi.id}
                    {...kpi}
                    icono={<Icono size={20} aria-hidden="true" />}
                    valor={datos?.resumen[kpi.clave] ?? null}
                    cargando={!datos && consulta.cargando}
                    accionable
                    disabled={!habilitada}
                    seleccionada={parametros.get('estadoOperativo') === kpi.id}
                    alSeleccionar={(id) =>
                      cambiar({
                        estadoOperativo: parametros.get('estadoOperativo') === id ? '' : id,
                      })
                    }
                  />
                ))}
              </SimpleGrid>
              {datos && (
                <Group gap="xs" justify="flex-end" className={clases.actualizacion}>
                  <IconClockHour4 size={16} aria-hidden="true" />
                  <Text size="xs">
                    Actualizado: {fechaHora.format(new Date(datos.consultadoEn))} · Se actualiza
                    cada 30 s mientras la página está visible.
                  </Text>
                </Group>
              )}
              <div className={clases.tabla}>
                <TablaDatos
                  filas={datos?.contenido ?? []}
                  columnas={columnas}
                  obtenerId={(fila) => fila.idRepartidor}
                  tituloAccesible="Monitoreo de flota"
                  anchoMinimo={900}
                  estado={
                    !datos
                      ? 'carga'
                      : datos.contenido.length
                        ? 'datos'
                        : filtrosActivos
                          ? 'sinResultados'
                          : 'vacio'
                  }
                  renderizarEstado={(estado) =>
                    estado === 'sinResultados' ? (
                      <EstadoVista
                        estado="sinResultados"
                        accion={{ id: 'limpiar', etiqueta: 'Limpiar filtros' }}
                        alAccionar={() => establecerParametros({})}
                      />
                    ) : (
                      <EstadoVista
                        estado="vacio"
                        titulo="No hay repartidores con jornada para esta fecha"
                        descripcion="Usa «Abrir jornada» para asignar una furgoneta y una zona a un repartidor."
                      />
                    )
                  }
                  actualizando={consulta.cargando}
                  paginacion={{
                    pagina: datos?.pagina ?? 1,
                    tamanioPagina: datos?.tamanoPagina ?? 50,
                    total: datos?.totalElementos ?? 0,
                  }}
                  alCambiarPagina={(pagina) => cambiar({ pagina: String(pagina) })}
                  alCambiarTamano={(tamano) => cambiar({ tamanoPagina: String(tamano) })}
                  estiloFila={(fila) =>
                    fila.estadoOperativo === 'SATURADO'
                      ? { background: 'var(--ia-color-error-background)' }
                      : {}
                  }
                />
              </div>
            </>
          )}
        </Stack>
      </EstadoVista>
      {!consulta.denegado && seleccion?.tipo === 'abrir' && (
        <FormularioJornada
          cliente={cliente}
          fecha={fechaBogota(datos ? new Date(datos.consultadoEn) : new Date())}
          habilitada={habilitada}
          alCerrar={cerrar}
          alGuardar={cerrar}
          alDenegar={consulta.denegar}
        />
      )}
      {!consulta.denegado && seleccion?.tipo === 'cerrar' && (
        <ConfirmarCierreJornada
          cliente={cliente}
          jornada={seleccion.jornada}
          habilitada={habilitada}
          alCerrar={cerrar}
          alGuardar={cerrar}
          alDenegar={consulta.denegar}
        />
      )}
      {!consulta.denegado && seleccion?.tipo === 'detalle' && (
        <DetalleJornada
          cliente={cliente}
          id={seleccion.id}
          alCerrar={cerrar}
          alDenegar={consulta.denegar}
        />
      )}
    </Stack>
  );
}
