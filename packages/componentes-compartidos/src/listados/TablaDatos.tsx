import type { CSSProperties, ReactNode } from 'react';
import { Box, Button, Group, Paper, Select, Skeleton, Stack, Table, Text } from '@mantine/core';
import { EstadoVista } from '../feedback/EstadoVista';
import type { EstadoConsulta } from '../tipos-ui';

export type ColumnaDatos<Fila> = { id: string; encabezado: string; celda: (fila: Fila) => ReactNode; alineacion?: 'left' | 'right' };

/** CR-07 básico: paginación remota controlada, sin ordenar ni recortar filas. */
export function TablaDatos<Fila>({ filas, obtenerId, columnas, tituloAccesible, estado, actualizando = false,
  paginacion, alCambiarPagina, alCambiarTamano, renderizarEstado, estiloFila, anchoMinimo = 1000 }: {
  filas: Fila[]; obtenerId: (fila: Fila) => string; columnas: ColumnaDatos<Fila>[]; tituloAccesible: string;
  estado: EstadoConsulta; actualizando?: boolean;
  paginacion: { pagina: number; tamanioPagina: number; total: number };
  alCambiarPagina: (pagina: number) => void; alCambiarTamano: (tamano: number) => void;
  renderizarEstado?: () => ReactNode; estiloFila?: (fila: Fila) => CSSProperties; anchoMinimo?: number;
}) {
  const { pagina, tamanioPagina, total } = paginacion;
  const ultima = Math.max(1, Math.ceil(total / tamanioPagina));
  const desde = total === 0 ? 0 : (pagina - 1) * tamanioPagina + 1;
  const hasta = total === 0 ? 0 : Math.min(desde + filas.length - 1, total);
  return <Paper withBorder style={{ minWidth: 0, overflow: 'hidden' }}>
    <Box aria-busy={estado === 'carga' || actualizando}>
      {estado === 'datos' ? <Table.ScrollContainer minWidth={anchoMinimo} type="native" tabIndex={0} role="region" aria-label={`Tabla desplazable: ${tituloAccesible}`}>
        <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover>
          <Table.Caption>{tituloAccesible}</Table.Caption>
          <Table.Thead><Table.Tr>{columnas.map((columna) => <Table.Th key={columna.id} scope="col" ta={columna.alineacion}>{columna.encabezado}</Table.Th>)}</Table.Tr></Table.Thead>
          <Table.Tbody>{filas.map((fila) => <Table.Tr key={obtenerId(fila)} style={estiloFila?.(fila)}>
            {columnas.map((columna) => <Table.Td key={columna.id} ta={columna.alineacion}>{columna.celda(fila)}</Table.Td>)}
          </Table.Tr>)}</Table.Tbody>
        </Table>
      </Table.ScrollContainer> : estado === 'carga' ? <EstadoVista estado="carga" esqueleto={<Stack p="md">{Array.from({ length: 5 }, (_, indice) => <Skeleton key={indice} height={48} />)}</Stack>} /> : renderizarEstado?.() ?? <EstadoVista estado={estado} />}
    </Box>
    {estado === 'datos' && <Group p="md" justify="space-between" wrap="wrap">
      <Text size="sm" role="status">Mostrando {desde}–{hasta} de {total}</Text>
      <Select label="Filas por página" size="sm" w={140} value={String(tamanioPagina)} allowDeselect={false}
        data={Array.from(new Set([20, 50, 100, tamanioPagina])).sort((a, b) => a - b).map(String)}
        onChange={(valor) => valor && alCambiarTamano(Number(valor))} />
      <Group gap="xs" aria-label="Paginación">
        <Button type="button" size="sm" mih={44} variant="default" disabled={pagina <= 1 || actualizando} onClick={() => alCambiarPagina(pagina - 1)}>Anterior</Button>
        <Text size="sm">Página {pagina} de {ultima}</Text>
        <Button type="button" size="sm" mih={44} variant="default" disabled={pagina >= ultima || actualizando} onClick={() => alCambiarPagina(pagina + 1)}>Siguiente</Button>
      </Group>
    </Group>}
  </Paper>;
}
