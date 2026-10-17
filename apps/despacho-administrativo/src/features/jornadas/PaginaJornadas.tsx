import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Group, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';
import { BadgeEstado, BarraFiltros, EncabezadoPagina, EstadoVista, FranjaEstado, TablaDatos, TarjetaKpi, type ColumnaDatos } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarMonitoreo } from './api';
import { estadosOperativos, fechaBogota, validarParametros, type FilaMonitoreo, type Jornada } from './modelo';
import { useConsultaJornadas } from './useConsultaJornadas';
import { FormularioJornada } from './FormularioJornada';
import { ConfirmarCierreJornada } from './ConfirmarCierreJornada';
import { DetalleJornada } from './DetalleJornada';
import { MetricasJornada } from './MetricasJornada';

const etiquetas = { DISPONIBLE: 'Disponible', EN_RUTA: 'En ruta', SATURADO: 'Saturado', FUERA_DE_TURNO: 'Fuera de turno' };
const kpis = [
  { id: 'DISPONIBLE', etiqueta: 'Disponibles', clave: 'disponible', tono: 'availability' },
  { id: 'EN_RUTA', etiqueta: 'En ruta', clave: 'enRuta', tono: 'info' },
  { id: 'SATURADO', etiqueta: 'Saturados', clave: 'saturado', tono: 'error' },
  { id: 'FUERA_DE_TURNO', etiqueta: 'Fuera de turno', clave: 'fueraDeTurno', tono: 'neutral' },
] as const;
type Seleccion = { tipo: 'abrir' } | { tipo: 'cerrar'; jornada: Jornada } | { tipo: 'detalle'; id: string };
export function PaginaJornadas() {
  const cliente = useClienteApi();
  const [parametros, establecerParametros] = useSearchParams();
  const clave = parametros.toString(), errores = validarParametros(parametros);
  const cargar = useCallback((signal: AbortSignal) => consultarMonitoreo(cliente, new URLSearchParams(clave), signal), [cliente, clave]);
  const consulta = useConsultaJornadas(cargar, !errores.length, 30000);
  const [seleccion, seleccionar] = useState<Seleccion | null>(null);
  const [sinConexion, sinConectar] = useState(!navigator.onLine);
  useEffect(() => {
    const conectar = () => { sinConectar(false); consulta.actualizar(); }, desconectar = () => sinConectar(true);
    window.addEventListener('online', conectar); window.addEventListener('offline', desconectar);
    return () => { window.removeEventListener('online', conectar); window.removeEventListener('offline', desconectar); };
  }, [consulta.actualizar]);
  useEffect(() => { if (consulta.denegado) seleccionar(null); }, [consulta.denegado]);
  const cambiar = (cambios: Record<string, string>) => {
    const siguientes = new URLSearchParams(parametros);
    if (!('pagina' in cambios)) siguientes.set('pagina', '1');
    Object.entries(cambios).forEach(([k, v]) => { if (v) siguientes.set(k, v); else siguientes.delete(k); });
    establecerParametros(siguientes);
  };
  const datos = consulta.datos;
  useEffect(() => {
    if (consulta.confirmada && datos && datos.pagina > Math.max(1, datos.totalPaginas)) {
      const siguientes = new URLSearchParams(clave); siguientes.set('pagina', String(Math.max(1, datos.totalPaginas))); establecerParametros(siguientes, { replace: true });
    }
  }, [consulta.confirmada, datos, clave, establecerParametros]);
  const habilitada = consulta.confirmada && !errores.length && !sinConexion && !consulta.denegado;
  const cerrar = () => { seleccionar(null); consulta.actualizar(); };
  const columnas: ColumnaDatos<FilaMonitoreo>[] = [
    { id: 'nombre', encabezado: 'Repartidor', celda: (fila) => fila.nombre },
    { id: 'estado', encabezado: 'Estado operativo', celda: (fila) => <BadgeEstado contexto="operacionRepartidor" valor={fila.estadoOperativo} /> },
    { id: 'vehiculo', encabezado: 'Furgoneta / zona', celda: (fila) => fila.jornada ? <Stack gap="xs"><Text>{fila.jornada.placa}</Text><Text size="xs">{fila.jornada.idZona}</Text></Stack> : 'Sin jornada' },
    { id: 'ocupacion', encabezado: 'Ocupación confirmada', celda: (fila) => fila.jornada ? <MetricasJornada jornada={fila.jornada} compacta /> : 'Sin jornada activa' },
    { id: 'acciones', encabezado: 'Acciones', celda: (fila) => fila.jornada && <Group gap="xs">
      <Button variant="subtle" size="sm" disabled={!habilitada} onClick={() => seleccionar({ tipo: 'detalle', id: fila.jornada!.idJornada })} aria-label={`Ver jornada de ${fila.nombre}`}>Ver detalle</Button>
      <Button variant="subtle" size="sm" disabled={!habilitada || fila.jornada.estado !== 'ACTIVA' || !estadosOperativos.includes(fila.estadoOperativo as typeof estadosOperativos[number])}
        onClick={() => seleccionar({ tipo: 'cerrar', jornada: fila.jornada! })} aria-label={`Cerrar jornada de ${fila.nombre}`}>Cerrar jornada</Button>
    </Group> },
  ];
  return <Stack gap="lg" style={{ minWidth: 0 }}>
    <EncabezadoPagina titulo="Jornadas y monitoreo" subtitulo="Asigna recursos y supervisa la ocupación confirmada de la flota."
      acciones={!consulta.denegado && <Group>
        <Button variant="outline" leftSection={<IconRefresh size={20} aria-hidden="true" />} disabled={consulta.cargando} onClick={consulta.actualizar}>Actualizar</Button>
        <Button leftSection={<IconPlus size={20} aria-hidden="true" />} disabled={!habilitada} onClick={() => seleccionar({ tipo: 'abrir' })}>Abrir jornada</Button>
      </Group>} />
    <EstadoVista estado={consulta.denegado ? 'sinPermiso' : 'datos'}>
      <Stack gap="lg">
        <BarraFiltros consultando={consulta.cargando} alLimpiar={() => establecerParametros({})} alQuitarFiltro={(id) => cambiar({ [id]: '' })}
          activos={['fecha', 'estadoOperativo', 'idZona'].filter((id) => parametros.has(id)).map((id) => ({ id, etiqueta: `${id === 'fecha' ? 'Fecha' : id === 'idZona' ? 'Zona' : 'Estado'}: ${id === 'estadoOperativo' ? etiquetas[parametros.get(id) as keyof typeof etiquetas] ?? 'Estado no disponible' : parametros.get(id)}` }))}
          controles={<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          <TextInput type="date" label="Fecha de consulta" value={parametros.get('fecha') ?? ''} description="Sin selección: hoy en America/Bogota." onChange={(e) => cambiar({ fecha: e.currentTarget.value })} />
          <Select label="Estado operativo" clearable value={parametros.get('estadoOperativo')} data={estadosOperativos.map((id) => ({ value: id, label: etiquetas[id] }))} onChange={(v) => cambiar({ estadoOperativo: v ?? '' })} />
          <TextInput label="Identificador de zona" value={parametros.get('idZona') ?? ''} onChange={(e) => cambiar({ idZona: e.currentTarget.value })} />
        </SimpleGrid>} />
        {errores.length > 0 && <Alert role="alert" title="Revisa los filtros" color="red">{errores.join(' ')}</Alert>}
        {sinConexion && <FranjaEstado tipo="sinConexion" />}
        {datos && !consulta.confirmada && <FranjaEstado tipo="datosDesactualizados" accion={{ id: 'actualizar', etiqueta: 'Actualizar datos', disabled: consulta.cargando }} alAccionar={consulta.actualizar} />}
        {consulta.error && !datos && <EstadoVista estado="error" descripcion={consulta.error} accion={{ id: 'reintentar', etiqueta: 'Reintentar consulta' }} alAccionar={consulta.actualizar} />}
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>{kpis.map((kpi) => <TarjetaKpi key={kpi.id} {...kpi} valor={datos?.resumen[kpi.clave] ?? null}
          cargando={!datos && consulta.cargando} accionable disabled={!habilitada} seleccionada={parametros.get('estadoOperativo') === kpi.id}
          alSeleccionar={(id) => cambiar({ estadoOperativo: parametros.get('estadoOperativo') === id ? '' : id })} />)}</SimpleGrid>
        {datos && <Text size="sm" c="dimmed">Última consulta confirmada: {new Date(datos.consultadoEn).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}. Actualización cada 30 segundos con esta página visible.</Text>}
        <TablaDatos filas={datos?.contenido ?? []} columnas={columnas} obtenerId={(fila) => fila.idRepartidor} tituloAccesible="Monitoreo de flota"
          estado={!datos && consulta.cargando ? 'carga' : !datos && (consulta.error || errores.length) ? 'error' : datos?.contenido.length ? 'datos' : 'vacio'} actualizando={consulta.cargando}
          paginacion={{ pagina: datos?.pagina ?? 1, tamanioPagina: datos?.tamanoPagina ?? 50, total: datos?.totalElementos ?? 0 }}
          alCambiarPagina={(pagina) => cambiar({ pagina: String(pagina) })} alCambiarTamano={(tamano) => cambiar({ tamanoPagina: String(tamano) })} />
      </Stack>
    </EstadoVista>
    {!consulta.denegado && seleccion?.tipo === 'abrir' && <FormularioJornada cliente={cliente} fecha={fechaBogota(datos ? new Date(datos.consultadoEn) : new Date())}
      habilitada={habilitada} alCerrar={cerrar} alGuardar={cerrar} alDenegar={consulta.denegar} />}
    {!consulta.denegado && seleccion?.tipo === 'cerrar' && <ConfirmarCierreJornada cliente={cliente} jornada={seleccion.jornada}
      habilitada={habilitada} alCerrar={cerrar} alGuardar={cerrar} alDenegar={consulta.denegar} />}
    {!consulta.denegado && seleccion?.tipo === 'detalle' && <DetalleJornada cliente={cliente} id={seleccion.id} alCerrar={cerrar} alDenegar={consulta.denegar} />}
  </Stack>;
}
