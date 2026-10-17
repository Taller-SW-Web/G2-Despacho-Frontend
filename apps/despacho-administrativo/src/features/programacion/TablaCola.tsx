import { Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import { BadgeEstado, EstadoVista, TablaDatos, type ColumnaDatos, type EstadoConsulta } from '@despacho/componentes-compartidos';
import { formatearFecha, formatoNumero, type PaginaPendientes, type Pendiente } from './modelo';
import clases from './Programacion.module.css';

export function TablaCola({ pagina, estado, nuevo, bloqueada, alAsignar, alVerDetalle, alCambiarPagina, alCambiarTamano, alGenerar, alLimpiar, alReintentar }: {
  pagina: PaginaPendientes | null; estado: EstadoConsulta; nuevo: string | null; bloqueada: boolean;
  alAsignar: (d: Pendiente) => void; alVerDetalle: (d: Pendiente) => void; alCambiarPagina: (p: number) => void;
  alCambiarTamano: (t: number) => void; alGenerar: () => void; alLimpiar: () => void; alReintentar: () => void;
}) {
  const columnas: ColumnaDatos<Pendiente>[] = [
    { id: 'codigo', encabezado: 'Código de rastreo', celda: (d) => <Stack gap="xs" maw={150}>
      <Text size="sm" className={clases.codigo}>{d.codigoRastreoInterno}</Text>
      {d.esSimulacion && <span className={clases.simulado}><BadgeEstado contexto="etiqueta" valor="SIMULADO" size="sm" /></span>}
      {d.idDespacho === nuevo && <BadgeEstado contexto="etiqueta" valor="NUEVO" size="sm" />}
    </Stack> },
    { id: 'pedido', encabezado: 'Pedido', prioridadResponsive: 'secundaria', celda: (d) => <Text size="xs" c="dimmed" maw={110}>{d.idPedido}</Text> },
    { id: 'zona', encabezado: 'Zona', celda: (d) => <Text size="sm" maw={100}>{d.nombreZona}</Text> },
    { id: 'direccion', encabezado: 'Dirección', celda: (d) => <Tooltip label={d.direccion} events={{ hover: true, focus: true, touch: true }}>
      <Text size="sm" lineClamp={1} tabIndex={0} className={clases.direccion}>{d.direccion}</Text></Tooltip> },
    { id: 'peso', encabezado: 'Peso (kg)', alineacion: 'right', celda: (d) => formatoNumero.format(d.pesoTotalKg) },
    { id: 'volumen', encabezado: 'Volumen (m³)', alineacion: 'right', prioridadResponsive: 'secundaria', celda: (d) => formatoNumero.format(d.volumenTotalM3) },
    { id: 'paquetes', encabezado: 'Paquetes', alineacion: 'right', celda: (d) => <Text size="sm" miw={60}>{d.cantidadPaquetes}</Text> },
    { id: 'fecha', encabezado: 'Fecha programada', celda: (d) => <Stack gap="xs"><Text size="sm" className="ia-num">{formatearFecha(d.fechaProgramada)}</Text>
      {!d.asignable && <BadgeEstado contexto="etiqueta" valor="PROGRAMADO" complemento={formatearFecha(d.disponibleDesde ?? d.fechaProgramada)} size="sm" />}</Stack> },
    { id: 'intento', encabezado: 'Intento', celda: (d) => <Stack gap="xs" miw={88}><Text size="xs">{d.numeroIntentos} consumidos</Text>
      {d.reintento ? <BadgeEstado contexto="etiqueta" valor="REINTENTO" size="sm" /> : <Text size="xs">Primer intento</Text>}</Stack> },
    { id: 'espera', encabezado: 'Tiempo en espera', prioridadResponsive: 'secundaria', celda: (d) => <Group gap="xs" wrap="nowrap">
      <Text size="sm" className="ia-num">{Math.floor(d.tiempoEsperaSegundos / 3600)} h {Math.floor(d.tiempoEsperaSegundos / 60) % 60} min</Text>
      {d.tiempoEsperaSegundos > 14_400 && <BadgeEstado contexto="etiqueta" valor="TIEMPO_ESPERA_ELEVADO" />}</Group> },
  ];
  return <TablaDatos filas={pagina?.contenido ?? []} obtenerId={(d) => d.idDespacho} columnas={columnas} tituloAccesible="Cola de despachos pendientes de asignación"
    estado={estado} actualizando={bloqueada && estado === 'datos'} anchoMinimo={1120} tamaniosPagina={[10, 20, 50, 100]}
    paginacion={pagina ? { pagina: pagina.paginaActual, tamanioPagina: pagina.tamanoPagina, total: pagina.totalElementos } : undefined}
    alCambiarPagina={alCambiarPagina} alCambiarTamano={alCambiarTamano}
    estiloFila={(d) => d.idDespacho === nuevo ? { backgroundColor: 'var(--mantine-color-blue-0)' } : {}}
    renderizarAcciones={(d) => <Stack gap="xs" w={116}>
      <Button type="button" variant="outline" size="sm" px="xs" mih={44} disabled={bloqueada || !d.asignable} onClick={() => alAsignar(d)}>Asignar</Button>
      {!d.asignable && <Text size="xs">Disponible desde {formatearFecha(d.disponibleDesde ?? d.fechaProgramada)}</Text>}
      <Button type="button" variant="subtle" size="sm" px="xs" mih={44} onClick={() => alVerDetalle(d)}>Ver detalle</Button>
    </Stack>}
    renderizarEstado={() => <EstadoVista estado={estado === 'carga' || estado === 'datos' ? 'error' : estado}
      titulo={estado === 'vacio' ? 'No hay despachos pendientes de asignación' : undefined}
      descripcion={estado === 'vacio' ? 'Aquí aparecerán los pedidos listos para programar su entrega.' : undefined}
      accion={{ id: 'accion', etiqueta: estado === 'vacio' ? 'Generar pedido de prueba' : estado === 'sinResultados' ? 'Limpiar filtros' : 'Reintentar consulta', disabled: bloqueada }}
      alAccionar={estado === 'vacio' ? alGenerar : estado === 'sinResultados' ? alLimpiar : alReintentar} />} />;
}
