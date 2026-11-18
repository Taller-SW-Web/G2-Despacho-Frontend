import { useEffect, useMemo } from 'react';
import { Button, Group, Select, Skeleton, Stack, TextInput } from '@mantine/core';
import { EstadoVista } from '@despacho/componentes-compartidos';
import { PanelGeografico } from './PanelGeografico';
import { useCapaGeografica } from './useCapaGeografica';

export function ExploradorGeografico({
  nombre,
  estado,
  revision,
  alFiltrar,
  alDenegar,
}: {
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'TODOS';
  revision: number;
  alFiltrar: (campo: string, valor: string) => void;
  alDenegar: () => void;
}) {
  const consulta = useCapaGeografica(undefined, revision);
  useEffect(() => {
    if (consulta.denegado) alDenegar();
  }, [consulta.denegado, alDenegar]);
  const capa = useMemo(
    () =>
      consulta.datos
        ? {
            ...consulta.datos,
            features: consulta.datos.features.filter(
              ({ properties: p }) =>
                (estado === 'TODOS' || p.estado === estado) &&
                p.nombre.toLocaleLowerCase().includes(nombre.trim().toLocaleLowerCase()),
            ),
          }
        : null,
    [consulta.datos, nombre, estado],
  );
  return (
    <Stack>
      <Group align="end">
        <TextInput
          label="Buscar distrito en mapa"
          value={nombre}
          onChange={(e) => alFiltrar('nombre', e.currentTarget.value)}
        />
        <Select
          label="Estado en mapa"
          value={estado}
          allowDeselect={false}
          data={[
            { value: 'ACTIVO', label: 'Activos' },
            { value: 'INACTIVO', label: 'Inactivos' },
            { value: 'TODOS', label: 'Todos' },
          ]}
          onChange={(valor) => alFiltrar('estado', valor ?? 'TODOS')}
        />
        <Button variant="default" onClick={consulta.reintentar}>
          Actualizar mapa
        </Button>
      </Group>
      {consulta.cargando ? (
        <Skeleton height={440} aria-label="Cargando geometrías" />
      ) : consulta.error ? (
        <EstadoVista
          estado={consulta.denegado ? 'sinPermiso' : 'error'}
          descripcion={consulta.error}
          accion={{ id: 'reintentar', etiqueta: 'Reintentar mapa' }}
          alAccionar={consulta.reintentar}
        />
      ) : (
        capa && <PanelGeografico capa={capa} />
      )}
    </Stack>
  );
}
