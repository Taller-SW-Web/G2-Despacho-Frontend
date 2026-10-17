import type { CSSProperties, ReactNode } from 'react';
import { Box, Button, Group, Paper, Select, Skeleton, Table, Text, UnstyledButton } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconArrowsSort } from '@tabler/icons-react';
import { EstadoVista } from '../feedback/EstadoVista';
import type { EstadoConsulta, OrdenUi, PaginacionUi } from '../tipos-ui';
import clases from './TablaDatos.module.css';

export type ColumnaDatos<Fila> = {
  id: string;
  encabezado: string;
  celda: (fila: Fila) => ReactNode;
  alineacion?: 'left' | 'right' | 'center';
  ordenable?: boolean;
  /** Las secundarias se ocultan entre 768 y 1199 px; el detalle debe ofrecer sus datos. */
  prioridadResponsive?: 'principal' | 'secundaria';
};

export type PropiedadesTablaDatos<Fila> = {
  filas: Fila[];
  obtenerId: (fila: Fila) => string;
  columnas: ColumnaDatos<Fila>[];
  tituloAccesible: string;
  estado: EstadoConsulta;
  actualizando?: boolean;
  orden?: OrdenUi;
  paginacion?: PaginacionUi;
  alCambiarOrden?: (orden: OrdenUi) => void;
  alCambiarPagina?: (pagina: number) => void;
  /** Compatibilidad con los listados existentes que permiten elegir tamaño de página. */
  alCambiarTamano?: (tamano: number) => void;
  renderizarAcciones?: (fila: Fila) => ReactNode;
  renderizarEstado?: (estado: EstadoConsulta) => ReactNode;
  estiloFila?: (fila: Fila) => CSSProperties;
  anchoMinimo?: number;
};

/** CR-07: solicita orden/página sin ordenar, recortar ni volver a paginar las filas recibidas. */
export function TablaDatos<Fila>({ filas, obtenerId, columnas, tituloAccesible, estado, actualizando = false,
  orden = null, paginacion, alCambiarOrden, alCambiarPagina, alCambiarTamano, renderizarAcciones,
  renderizarEstado, estiloFila, anchoMinimo = 1000 }: PropiedadesTablaDatos<Fila>) {
  const conservaDatos = estado === 'error' && filas.length > 0;
  const muestraDatos = estado === 'datos' || conservaDatos;
  const muestraTabla = muestraDatos || estado === 'carga';
  const ultima = paginacion ? Math.max(1, Math.ceil(paginacion.total / paginacion.tamanioPagina)) : 1;
  const desde = paginacion && paginacion.total > 0 && filas.length > 0 ? (paginacion.pagina - 1) * paginacion.tamanioPagina + 1 : 0;
  const hasta = paginacion && desde > 0 ? Math.min(desde + filas.length - 1, paginacion.total) : 0;
  const tieneSecundarias = columnas.some((columna) => columna.prioridadResponsive === 'secundaria');

  function solicitarOrden(columna: string) {
    const siguiente: OrdenUi = orden?.columna !== columna ? { columna, direccion: 'asc' }
      : orden.direccion === 'asc' ? { columna, direccion: 'desc' } : null;
    alCambiarOrden?.(siguiente);
  }

  return <Paper withBorder radius="md" className={clases.raiz}>
    <Box aria-busy={estado === 'carga' || actualizando}>
      {conservaDatos && (renderizarEstado?.(estado) ?? <EstadoVista estado="error" compacto
        titulo="No pudimos actualizar la información" descripcion="Se muestran los últimos datos disponibles. Inténtalo nuevamente." />)}
      {actualizando && muestraDatos && <Text p="md" size="sm" role="status">Actualizando información…</Text>}
      {muestraTabla ? <Box className={clases.desplazamiento} tabIndex={0} role="region" aria-label={`Tabla desplazable: ${tituloAccesible}`}>
        <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover className={clases.tabla}
          data-secundarias={tieneSecundarias || undefined} style={{ '--tabla-ancho-minimo': `${anchoMinimo}px` } as CSSProperties}>
          <Table.Caption>{tituloAccesible}</Table.Caption>
          <Table.Thead><Table.Tr>
            {columnas.map((columna) => {
              const direccion = orden?.columna === columna.id ? orden.direccion : null;
              const Icono = direccion === 'asc' ? IconArrowUp : direccion === 'desc' ? IconArrowDown : IconArrowsSort;
              return <Table.Th key={columna.id} scope="col" ta={columna.alineacion} data-prioridad={columna.prioridadResponsive}
                aria-sort={columna.ordenable ? direccion === 'asc' ? 'ascending' : direccion === 'desc' ? 'descending' : 'none' : undefined}>
                {columna.ordenable ? <UnstyledButton type="button" className={clases.orden}
                  disabled={!alCambiarOrden || actualizando || estado === 'carga'} onClick={() => solicitarOrden(columna.id)}
                  aria-label={`Ordenar por ${columna.encabezado}`}>
                  {columna.encabezado}<Icono size={16} aria-hidden="true" />
                </UnstyledButton> : columna.encabezado}
              </Table.Th>;
            })}
            {renderizarAcciones && <Table.Th scope="col">Acciones</Table.Th>}
          </Table.Tr></Table.Thead>
          <Table.Tbody>{estado === 'carga' ? Array.from({ length: 5 }, (_, indice) => <Table.Tr key={indice} aria-hidden="true">
            {columnas.map((columna) => <Table.Td key={columna.id} data-prioridad={columna.prioridadResponsive}><Skeleton height={24} /></Table.Td>)}
            {renderizarAcciones && <Table.Td><Skeleton height={24} /></Table.Td>}
          </Table.Tr>) : filas.map((fila) => <Table.Tr key={obtenerId(fila)} style={estiloFila?.(fila)}>
            {columnas.map((columna) => <Table.Td key={columna.id} ta={columna.alineacion} data-prioridad={columna.prioridadResponsive}
              className={columna.alineacion === 'right' ? `ia-num ${clases.numero}` : undefined}>{columna.celda(fila)}</Table.Td>)}
            {renderizarAcciones && <Table.Td>{renderizarAcciones(fila)}</Table.Td>}
          </Table.Tr>)}</Table.Tbody>
        </Table>
      </Box> : renderizarEstado?.(estado) ?? <EstadoVista estado={estado} />}
      {estado === 'carga' && <Text p="md" size="sm" role="status">Cargando información…</Text>}
    </Box>
    {muestraDatos && paginacion && <Group p="md" justify="space-between" wrap="wrap">
      <Text size="sm" role="status">{desde === 0 ? `Mostrando 0 de ${paginacion.total}` : `Mostrando ${desde}–${hasta} de ${paginacion.total}`}</Text>
      {alCambiarTamano && <Select label="Filas por página" size="sm" w={140} value={String(paginacion.tamanioPagina)} allowDeselect={false}
        disabled={actualizando} styles={{ input: { minHeight: 44 } }}
        data={Array.from(new Set([20, 50, 100, paginacion.tamanioPagina])).sort((a, b) => a - b).map(String)}
        onChange={(valor) => { if (valor) alCambiarTamano(Number(valor)); }} />}
      {paginacion.total > 0 && <Group component="nav" gap="xs" aria-label="Paginación">
        <Button type="button" size="sm" mih={44} variant="outline" color="orange.8"
          disabled={!alCambiarPagina || paginacion.pagina <= 1 || actualizando} onClick={() => alCambiarPagina?.(paginacion.pagina - 1)}>Anterior</Button>
        <Text size="sm">Página {paginacion.pagina} de {ultima}</Text>
        <Button type="button" size="sm" mih={44} variant="outline" color="orange.8"
          disabled={!alCambiarPagina || paginacion.pagina >= ultima || actualizando} onClick={() => alCambiarPagina?.(paginacion.pagina + 1)}>Siguiente</Button>
      </Group>}
    </Group>}
  </Paper>;
}
