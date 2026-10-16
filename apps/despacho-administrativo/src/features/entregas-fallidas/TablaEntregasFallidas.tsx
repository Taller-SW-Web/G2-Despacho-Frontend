import { Badge, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCamera } from '@tabler/icons-react';
import { BadgeEstado, TablaDatos, type ColumnaDatos, type EstadoConsulta } from '@despacho/componentes-compartidos';
import type { ReactNode } from 'react';
import { formatoFechaLima, type EntregaFallida, type PaginaFallidos } from './modelo';

/** Puntos de integración para ES-F04-02/03; nunca ejecuta comandos de recepción. */
export type DestinosEntregasFallidas = {
  alVerDetalle?: (entrega: EntregaFallida, consulta: string) => void;
  alConfirmarRecepcion?: (entrega: EntregaFallida, consulta: string) => void;
};

export function TablaEntregasFallidas({ pagina, consulta, estado, actualizando, alCambiarPagina, alCambiarTamano, renderizarEstado,
  alVerDetalle, alConfirmarRecepcion }: DestinosEntregasFallidas & {
  pagina: PaginaFallidos | null; consulta: string; estado: EstadoConsulta; actualizando: boolean;
  alCambiarPagina: (numero: number) => void; alCambiarTamano: (tamano: number) => void; renderizarEstado: () => ReactNode;
}) {
  const columnas: ColumnaDatos<EntregaFallida>[] = [
    { id: 'codigo', encabezado: 'Código operativo interno', celda: (fila) => <Text fw={600} size="sm">{fila.codigoRastreoInterno}</Text> },
    { id: 'fecha', encabezado: 'Fecha de incidencia', celda: (fila) => <Text size="sm">{formatoFechaLima.format(new Date(fila.fechaIncidencia))}</Text> },
    { id: 'motivo', encabezado: 'Motivo', celda: (fila) => <Text size="sm">{fila.motivo.etiqueta}</Text> },
    { id: 'intentos', encabezado: 'Intentos consumidos', alineacion: 'right', celda: (fila) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{fila.numeroIntentos} de {fila.maximoIntentos}</Text> },
    { id: 'repartidor', encabezado: 'Repartidor', celda: (fila) => <Stack gap="xs" miw={180}>
      <Text size="sm" fw={fila.retornoAtrasado ? 600 : 400}>{fila.repartidor.nombre ?? 'Nombre del repartidor no disponible'}</Text>
      <Text size="sm" c="dimmed">{fila.repartidor.idRepartidor}</Text>
    </Stack> },
    { id: 'recepcion', encabezado: 'Recepción', celda: (fila) => <Stack gap="xs" miw={180}>
      <BadgeEstado contexto="recepcion" valor={fila.recepcion} />
      {fila.recepcion === 'PENDIENTE_RETORNO' && fila.retornoAtrasado === null && <Text size="sm">No se pudo confirmar el cierre de jornada</Text>}
    </Stack> },
    { id: 'evidencia', encabezado: 'Evidencia', celda: (fila) => fila.tieneEvidencia ? <IconCamera role="img" aria-label="Tiene evidencia" size={22} /> : <span aria-label="Sin evidencia">—</span> },
    { id: 'etiquetas', encabezado: 'Etiquetas', celda: (fila) => <Stack gap="xs" align="flex-start" miw={150}>
      {fila.motivo.codigo === 'NO_INTENTADO' && <Text size="sm" fw={600}>No intentado en esta salida</Text>}
      {fila.pedidoAnulado && <Badge variant="light" color="gray.8" style={{ whiteSpace: 'normal', height: 'auto' }}>Pedido anulado</Badge>}
      {fila.retornoAtrasado === true && <Group gap="xs" wrap="nowrap"><IconAlertTriangle size={18} aria-hidden="true" /><Text size="sm" fw={600}>Retorno atrasado</Text></Group>}
    </Stack> },
    { id: 'acciones', encabezado: 'Acciones', celda: (fila) => <Stack gap="xs" miw={165}>
      <Button type="button" size="sm" mih={44} variant="subtle" disabled={!alVerDetalle || actualizando} aria-describedby={!alVerDetalle ? 'dependencias-f04' : undefined}
        onClick={() => alVerDetalle?.(fila, consulta)}>Ver detalle</Button>
      {fila.recepcion === 'PENDIENTE_RETORNO' && <Button type="button" size="sm" mih={44} variant="outline" disabled={!alConfirmarRecepcion || actualizando}
        aria-describedby={!alConfirmarRecepcion ? 'dependencias-f04' : undefined} onClick={() => alConfirmarRecepcion?.(fila, consulta)}>Confirmar recepción</Button>}
    </Stack> },
  ];
  return <TablaDatos filas={pagina?.contenido ?? []} obtenerId={(fila) => `${fila.idDespacho}:${fila.idIncidencia}`} columnas={columnas}
    tituloAccesible="Entregas fallidas · Incidencia vigente · Fechas en America/Lima · Recibidos primero y más antiguos primero"
    estado={estado} actualizando={actualizando} anchoMinimo={1550} renderizarEstado={renderizarEstado}
    paginacion={{ pagina: pagina?.pagina ?? 1, tamanioPagina: pagina?.tamanoPagina ?? 20, total: pagina?.totalElementos ?? 0 }}
    alCambiarPagina={alCambiarPagina} alCambiarTamano={alCambiarTamano}
    estiloFila={(fila) => fila.retornoAtrasado === true ? { background: 'var(--mantine-color-red-0)', borderInlineStart: '4px solid var(--mantine-color-red-7)' } : {}} />;
}
