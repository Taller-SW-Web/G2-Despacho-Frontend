import { useState } from 'react';
import { Alert, Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { MapaDiferido } from './MapaDiferido';
import type { PropiedadesMapa } from './MapaDiferido';
import clases from './Geometrias.module.css';

export function PanelGeografico({
  capa,
  seleccionados = [],
  alSeleccionar,
  conflictos = [],
  postales = [],
  etiqueta,
  compacto = false,
}: PropiedadesMapa & { compacto?: boolean }) {
  const [centrado, setCentrado] = useState<string>();
  const [ficha, setFicha] = useState<string>();
  const elegido = capa.features.find((entidad) => entidad.properties.id === ficha);
  const resaltados = alSeleccionar ? seleccionados : ficha ? [ficha] : [];
  return (
    <Stack>
      <Text size="sm">
        Contorno naranja: selección · gris discontinuo: inactivo · rojo: conflicto · sin relleno:
        referencia postal.
      </Text>
      <div className={compacto ? clases.panelesCompactos : clases.paneles}>
        <MapaDiferido
          capa={capa}
          seleccionados={resaltados}
          centrado={centrado}
          conflictos={conflictos}
          postales={postales}
          etiqueta={etiqueta}
          alSeleccionar={(entidad) => {
            setFicha(entidad.properties.id);
            alSeleccionar?.(entidad);
          }}
        />
        <Stack>
          {capa.zona && (
            <Alert title={capa.zona.nombre}>
              {capa.zona.estado === 'INACTIVO'
                ? 'Zona inactiva · sin cobertura nueva'
                : 'Composición de la zona'}
            </Alert>
          )}
          <div className={clases.lista} aria-label="Distritos del mapa">
            {!capa.features.length && <Text>No hay distritos para los filtros actuales.</Text>}
            {capa.features.map((entidad) => {
              const p = entidad.properties;
              const postal = p.soloCodigosPostales || postales.includes(p.id);
              return (
                <Stack key={p.id} gap={4} className={clases.fila}>
                  <Text fw={600}>
                    {p.nombre} · {p.ubigeo}
                  </Text>
                  <Group gap="xs">
                    <Badge color={p.estado === 'ACTIVO' ? 'green' : 'gray'}>
                      {p.estado === 'ACTIVO' ? 'Activo' : 'Inactivo · sin cobertura'}
                    </Badge>
                    {!entidad.geometry && <Badge color="yellow">Sin geometría</Badge>}
                    {postal && <Badge variant="outline">Referencia postal</Badge>}
                    {conflictos.includes(p.id) && (
                      <Badge color="red">Conflicto con otra zona</Badge>
                    )}
                  </Group>
                  <Group gap="xs">
                    <Button
                      size="compact-sm"
                      variant="subtle"
                      onClick={() => setFicha(p.id)}
                      aria-label={`Ver ficha de ${p.nombre}`}
                    >
                      Ficha
                    </Button>
                    <Button
                      size="compact-sm"
                      variant="default"
                      disabled={!entidad.geometry}
                      onClick={() => {
                        setFicha(p.id);
                        setCentrado(p.id);
                      }}
                      aria-label={`Centrar ${p.nombre}`}
                    >
                      Centrar
                    </Button>
                    {alSeleccionar && (
                      <Button
                        size="compact-sm"
                        variant={seleccionados.includes(p.id) ? 'filled' : 'light'}
                        aria-pressed={seleccionados.includes(p.id)}
                        aria-label={`${seleccionados.includes(p.id) ? 'Retirar' : 'Seleccionar'} ${p.nombre} en mapa`}
                        disabled={p.estado === 'INACTIVO' && !seleccionados.includes(p.id)}
                        onClick={() => {
                          setFicha(p.id);
                          alSeleccionar(entidad);
                        }}
                      >
                        {seleccionados.includes(p.id) ? 'Retirar' : 'Seleccionar'}
                      </Button>
                    )}
                  </Group>
                </Stack>
              );
            })}
          </div>
          {elegido && (
            <Card
              withBorder
              component="section"
              aria-label="Ficha geográfica"
              className={clases.ficha}
            >
              <Stack gap={4}>
                <Text fw={600}>{elegido.properties.nombre}</Text>
                <Text size="sm">
                  Ubigeo: {elegido.properties.ubigeo} · {elegido.properties.provincia}
                </Text>
                <Text size="sm">
                  Fuente: {elegido.properties.fuente ?? 'Sin procedencia registrada'}
                </Text>
                <Text size="sm">
                  Archivo: {elegido.properties.nombreArchivo ?? 'Carga directa por API'}
                </Text>
                <Text size="sm">
                  Revisión: {elegido.properties.versionFuente ?? 'Sin revisión'} · Versión
                  geográfica: {elegido.properties.versionGeometria}
                </Text>
                <Text size="sm">{elegido.geometry ? 'Geometría disponible' : 'Sin geometría'}</Text>
              </Stack>
            </Card>
          )}
        </Stack>
      </div>
    </Stack>
  );
}
