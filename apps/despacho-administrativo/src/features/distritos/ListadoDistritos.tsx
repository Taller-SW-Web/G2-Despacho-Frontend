import { Button, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import {
  BadgeEstado,
  EstadoVista,
  TablaDatos,
  type ColumnaDatos,
} from '@despacho/componentes-compartidos';
import type { DistritoAdministrable, EstadoDistrito } from './tipos';

type Propiedades = {
  filas: DistritoAdministrable[];
  consulta: 'carga' | 'datos' | 'error';
  nombre: string;
  estado: EstadoDistrito | 'TODOS';
  seleccionado?: string;
  bloqueado: boolean;
  alFiltrar: (campo: string, valor: string) => void;
  alReintentar: () => void;
  alLimpiarFiltros: () => void;
  alEditar: (id: string) => void;
  alCambiarEstado: (distrito: DistritoAdministrable) => void;
};

export function ListadoDistritos({
  filas,
  consulta,
  nombre,
  estado,
  seleccionado,
  bloqueado,
  alFiltrar,
  alReintentar,
  alLimpiarFiltros,
  alEditar,
  alCambiarEstado,
}: Propiedades) {
  const columnas: ColumnaDatos<DistritoAdministrable>[] = [
    {
      id: 'nombre',
      encabezado: 'Distrito',
      celda: (d) => (
        <>
          {d.nombre}
          {seleccionado === d.id && (
            <Text size="xs" c="dimmed">
              En edición
            </Text>
          )}
        </>
      ),
    },
    { id: 'provincia', encabezado: 'Provincia', celda: (d) => d.provincia },
    { id: 'departamento', encabezado: 'Departamento', celda: (d) => d.departamento },
    { id: 'ubigeo', encabezado: 'Ubigeo', celda: (d) => d.ubigeo },
    {
      id: 'estado',
      encabezado: 'Estado',
      celda: (d) => <BadgeEstado contexto="registro" valor={d.estado} />,
    },
  ];
  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput
          label="Buscar distrito por nombre"
          value={nombre}
          disabled={bloqueado}
          onChange={(e) => alFiltrar('nombre', e.currentTarget.value)}
        />
        <Select
          label="Estado de los distritos"
          allowDeselect={false}
          value={estado}
          disabled={bloqueado}
          onChange={(valor) => alFiltrar('estado', valor ?? 'ACTIVO')}
          data={[
            { value: 'ACTIVO', label: 'Activos' },
            { value: 'INACTIVO', label: 'Inactivos' },
            { value: 'TODOS', label: 'Todos' },
          ]}
        />
      </SimpleGrid>
      <TablaDatos
        filas={filas}
        obtenerId={(d) => d.id}
        columnas={columnas}
        tituloAccesible="Catálogo de distritos"
        anchoMinimo={780}
        estado={consulta === 'datos' ? (filas.length ? 'datos' : 'sinResultados') : consulta}
        estiloFila={(d) =>
          seleccionado === d.id ? { background: 'var(--ia-color-accent-signal-soft)' } : {}
        }
        renderizarEstado={(situacion) => (
          <EstadoVista
            estado={situacion === 'error' ? 'error' : 'sinResultados'}
            titulo={
              situacion === 'error'
                ? 'No se pudieron cargar los distritos'
                : 'No hay distritos que coincidan con los filtros'
            }
            accion={{
              id: 'recuperar',
              etiqueta: situacion === 'error' ? 'Reintentar listado' : 'Limpiar filtros',
            }}
            alAccionar={situacion === 'error' ? alReintentar : alLimpiarFiltros}
          />
        )}
        renderizarAcciones={(d) => (
          <Stack gap={0} align="flex-start">
            <Button
              size="sm"
              mih={44}
              variant="subtle"
              disabled={bloqueado}
              aria-label={`Editar ${d.nombre}`}
              onClick={() => alEditar(d.id)}
            >
              Editar
            </Button>
            <Button
              size="sm"
              mih={44}
              variant="subtle"
              disabled={bloqueado}
              color={d.estado === 'ACTIVO' ? 'red' : undefined}
              aria-label={`${d.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar'} ${d.nombre}`}
              onClick={() => alCambiarEstado(d)}
            >
              {d.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar'}
            </Button>
          </Stack>
        )}
      />
    </Stack>
  );
}
