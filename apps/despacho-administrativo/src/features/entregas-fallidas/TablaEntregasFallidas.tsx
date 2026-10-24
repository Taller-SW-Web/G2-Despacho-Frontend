import { Button, Group, Stack, Text } from '@mantine/core';
import { IconCamera, IconChevronRight } from '@tabler/icons-react';
import { BadgeEstado, TablaDatos, type ColumnaDatos, type EstadoConsulta } from '@despacho/componentes-compartidos';
import type { ReactNode } from 'react';
import { type EntregaFallida, type PaginaFallidos } from './modelo';
import clases from './EntregasFallidas.module.css';

const fechaLima = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });
const horaLima = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

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
    { id: 'codigo', encabezado: 'Código operativo interno', celda: (fila) => <Text fw={600} size="sm" className={clases.codigo}>{fila.codigoRastreoInterno}</Text> },
    { id: 'fecha', encabezado: 'Fecha de incidencia', celda: (fila) => <time dateTime={fila.fechaIncidencia}><Stack gap={4}>
      <Text size="sm" className="ia-num">{fechaLima.format(new Date(fila.fechaIncidencia))}</Text>
      <Text size="xs" c="dimmed" className="ia-num">{horaLima.format(new Date(fila.fechaIncidencia))}</Text>
    </Stack></time> },
    { id: 'motivo', encabezado: 'Motivo', celda: (fila) => <Text size="sm">{fila.motivo.etiqueta}</Text> },
    { id: 'intentos', encabezado: 'Intentos consumidos', alineacion: 'right', celda: (fila) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{fila.numeroIntentos} de {fila.maximoIntentos}</Text> },
    { id: 'repartidor', encabezado: 'Repartidor', celda: (fila) => <Stack gap={4}>
      <Text size="sm" fw={fila.retornoAtrasado ? 600 : 400}>{fila.repartidor.nombre ?? 'Nombre del repartidor no disponible'}</Text>
      {!fila.repartidor.nombre && <Text size="xs" c="dimmed" className={clases.identificador}>ID: {fila.repartidor.idRepartidor}</Text>}
    </Stack> },
    { id: 'recepcion', encabezado: 'Recepción', celda: (fila) => <Stack gap="xs" align="flex-start">
      <BadgeEstado contexto="recepcion" valor={fila.recepcion} />
      {fila.recepcion === 'PENDIENTE_RETORNO' && fila.retornoAtrasado === null && <Text size="sm">No se pudo confirmar el cierre de jornada</Text>}
    </Stack> },
    { id: 'evidencia', encabezado: 'Evidencia', celda: (fila) => fila.tieneEvidencia
      ? <span className={clases.evidencia}><IconCamera role="img" aria-label="Tiene evidencia" size={20} /></span>
      : <span aria-label="Sin evidencia" className={clases.sinEvidencia}>—</span> },
    { id: 'etiquetas', encabezado: 'Etiquetas', celda: (fila) => <Stack gap="xs" align="flex-start">
      {fila.motivo.codigo === 'NO_INTENTADO' && <BadgeEstado contexto="etiqueta" valor="NO_INTENTADO" size="sm" />}
      {fila.pedidoAnulado && <BadgeEstado contexto="etiqueta" valor="PEDIDO_ANULADO" size="sm" />}
      {fila.retornoAtrasado === true && <BadgeEstado contexto="etiqueta" valor="RETORNO_ATRASADO" size="sm" />}
    </Stack> },
    { id: 'acciones', encabezado: 'Acciones', celda: (fila) => <Stack gap="xs" className={clases.acciones}>
      <Button type="button" size="sm" mih={44} px="xs" variant="subtle" className={clases.verDetalle}
        rightSection={<IconChevronRight size={16} aria-hidden="true" />} disabled={!alVerDetalle || actualizando} aria-describedby={!alVerDetalle ? 'dependencias-f04' : undefined}
        onClick={() => alVerDetalle?.(fila, consulta)}>Ver detalle</Button>
      {fila.recepcion === 'PENDIENTE_RETORNO' && <Button type="button" size="sm" mih={44} variant="outline" disabled={!alConfirmarRecepcion || actualizando}
        aria-describedby={!alConfirmarRecepcion ? 'dependencias-f04' : undefined} onClick={() => alConfirmarRecepcion?.(fila, consulta)}>Confirmar recepción</Button>}
    </Stack> },
  ];
  return <section className={clases.listado} aria-label="Listado de entregas fallidas">
    <Group justify="space-between" gap="xs" className={clases.resumen}>
      <Text size="sm" fw={600}>{pagina ? `${pagina.totalElementos} ${pagina.totalElementos === 1 ? 'entrega fallida' : 'entregas fallidas'}` : 'Entregas fallidas'}</Text>
      <Text size="xs" c="dimmed">Recibidos primero · Más antiguos primero · Hora de Lima</Text>
    </Group>
    <TablaDatos filas={pagina?.contenido ?? []} obtenerId={(fila) => `${fila.idDespacho}:${fila.idIncidencia}`} columnas={columnas}
    tituloAccesible="Entregas fallidas · Incidencia vigente · Fechas en America/Lima · Recibidos primero y más antiguos primero"
    estado={estado} actualizando={actualizando} anchoMinimo={1080} paginacionNumerada renderizarEstado={renderizarEstado}
    paginacion={{ pagina: pagina?.pagina ?? 1, tamanioPagina: pagina?.tamanoPagina ?? 20, total: pagina?.totalElementos ?? 0 }}
    alCambiarPagina={alCambiarPagina} alCambiarTamano={alCambiarTamano}
    estiloFila={(fila) => fila.retornoAtrasado === true ? { background: 'var(--ia-color-error-background)', borderInlineStart: '4px solid var(--ia-color-error-default)' } : {}} />
  </section>;
}
