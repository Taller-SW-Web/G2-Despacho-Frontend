import { useEffect, useMemo } from 'react';
import { Alert, Button, Card, Skeleton, Stack, Text, Title } from '@mantine/core';
import { EstadoVista } from '@despacho/componentes-compartidos';
import { PanelGeografico } from './PanelGeografico';
import { useCapaGeografica } from './useCapaGeografica';
import type { EntidadDistrito } from './tipos';

export type SeleccionDistrital = {
  distrito: string;
  codigosPostales: string[];
  soloCodigosPostales?: boolean;
};
export function alternarDistrito(
  seleccion: SeleccionDistrital[],
  entidad: EntidadDistrito,
): SeleccionDistrital[] {
  const nombre = entidad.properties.nombre;
  if (seleccion.some((entrada) => entrada.distrito === nombre))
    return seleccion.filter((entrada) => entrada.distrito !== nombre);
  if (entidad.properties.estado !== 'ACTIVO') return seleccion;
  return [...seleccion, { distrito: nombre, codigosPostales: [] }];
}

export function SelectorMapaZona({
  seleccion,
  alCambiar,
  bloqueado,
  zonaId,
  alDenegar,
}: {
  seleccion: SeleccionDistrital[];
  alCambiar: (valor: SeleccionDistrital[]) => void;
  bloqueado: boolean;
  zonaId?: string;
  alDenegar?: () => void;
}) {
  const consulta = useCapaGeografica();
  useEffect(() => {
    if (consulta.denegado) alDenegar?.();
  }, [consulta.denegado, alDenegar]);
  const nombres = seleccion.map((d) => d.distrito);
  const seleccionados =
    consulta.datos?.features
      .filter((e) => nombres.includes(e.properties.nombre))
      .map((e) => e.properties.id) ?? [];
  const postales =
    consulta.datos?.features
      .filter((e) =>
        seleccion.some((d) => d.distrito === e.properties.nombre && d.soloCodigosPostales),
      )
      .map((e) => e.properties.id) ?? [];
  const conflictos = useMemo(
    () =>
      consulta.datos?.features
        .filter((e) => e.properties.zonas.some((z) => z.estado === 'ACTIVO' && z.id !== zonaId))
        .map((e) => e.properties.id) ?? [],
    [consulta.datos, zonaId],
  );
  return (
    <Card withBorder>
      <Stack>
        <Title order={2}>Selección geográfica</Title>
        <Text size="sm">
          Los cambios se guardan únicamente al pulsar Guardar zona. Los límites postales son
          referencias.
        </Text>
        {consulta.cargando ? (
          <Skeleton height={440} aria-label="Cargando selección geográfica" />
        ) : consulta.denegado ? (
          <EstadoVista estado="sinPermiso" />
        ) : consulta.error ? (
          <Alert title="Mapa no disponible">
            <Stack>
              <Text>{consulta.error}</Text>
              <Button variant="default" onClick={consulta.reintentar}>
                Reintentar mapa
              </Button>
            </Stack>
          </Alert>
        ) : (
          consulta.datos && (
            <PanelGeografico
              compacto
              capa={consulta.datos}
              seleccionados={seleccionados}
              postales={postales}
              conflictos={conflictos}
              alSeleccionar={(entidad) => {
                if (!bloqueado) alCambiar(alternarDistrito(seleccion, entidad));
              }}
              etiqueta="Mapa para seleccionar distritos de la zona"
            />
          )
        )}
      </Stack>
    </Card>
  );
}
