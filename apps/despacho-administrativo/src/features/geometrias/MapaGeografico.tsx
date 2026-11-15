import { useEffect, useRef, useState } from 'react';
import { Alert, Stack } from '@mantine/core';
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet';
import { geoJSON } from 'leaflet';
import type { GeoJSON as CapaLeaflet, Path, PathOptions } from 'leaflet';
import type { PropiedadesMapa } from './MapaDiferido';
import type { EntidadDistrito } from './tipos';
import 'leaflet/dist/leaflet.css';
import clases from './Geometrias.module.css';

function Encuadre({ capa, centrado }: Pick<PropiedadesMapa, 'capa' | 'centrado'>) {
  const mapa = useMap();
  useEffect(() => {
    const entidades = capa.features.filter(
      (entidad) => entidad.geometry && (!centrado || entidad.properties.id === centrado),
    );
    if (!entidades.length) return;
    const limites = geoJSON(entidades).getBounds();
    if (limites.isValid())
      mapa.fitBounds(limites, { padding: [24, 24], maxZoom: 14, animate: false });
  }, [mapa, capa, centrado]);
  useEffect(() => {
    const observador = new ResizeObserver(() => mapa.invalidateSize());
    observador.observe(mapa.getContainer());
    return () => observador.disconnect();
  }, [mapa]);
  return null;
}

function LimiteDistrito({
  entidad,
  estilo,
  alSeleccionar,
}: {
  entidad: EntidadDistrito;
  estilo: PathOptions;
  alSeleccionar?: PropiedadesMapa['alSeleccionar'];
}) {
  const capa = useRef<CapaLeaflet>(null);
  const seleccionar = useRef(alSeleccionar);
  useEffect(() => {
    seleccionar.current = alSeleccionar;
  }, [alSeleccionar]);
  useEffect(() => {
    capa.current?.clearLayers();
    capa.current?.addData(entidad);
    const retirar: (() => void)[] = [];
    capa.current?.eachLayer((limite) => {
      const elemento = (limite as Path).getElement();
      if (!elemento) return;
      elemento.setAttribute('data-distrito-id', entidad.properties.id);
      elemento.setAttribute('aria-label', `Límite de ${entidad.properties.nombre}`);
      elemento.setAttribute('role', 'button');
      elemento.setAttribute('tabindex', '0');
      const activar = (evento: Event) => {
        const tecla = (evento as KeyboardEvent).key;
        if (tecla === 'Enter' || tecla === ' ') {
          evento.preventDefault();
          evento.stopPropagation();
          seleccionar.current?.(entidad);
        }
      };
      elemento.addEventListener('keydown', activar);
      retirar.push(() => elemento.removeEventListener('keydown', activar));
    });
    return () => retirar.forEach((limpiar) => limpiar());
  }, [entidad]);
  useEffect(() => {
    capa.current?.setStyle(estilo);
  }, [estilo]);
  if (!entidad.geometry) return null;
  return (
    <GeoJSON
      ref={capa}
      data={entidad}
      style={estilo}
      eventHandlers={{ click: () => alSeleccionar?.(entidad) }}
    />
  );
}

export default function MapaGeografico({
  capa,
  seleccionados = [],
  centrado,
  conflictos = [],
  postales = [],
  alSeleccionar,
  etiqueta = 'Mapa de distritos de Lima y Callao',
}: PropiedadesMapa) {
  const [sinBase, setSinBase] = useState(false);
  const teselas =
    import.meta.env.VITE_MAPA_TESELAS_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const atribucion =
    import.meta.env.VITE_MAPA_ATRIBUCION ??
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  return (
    <Stack gap="xs">
      {sinBase && (
        <Alert title="Mapa base no disponible" role="status">
          Los límites siguen disponibles. También puedes usar la lista.
        </Alert>
      )}
      <div className={clases.mapa} role="region" aria-label={etiqueta}>
        <MapContainer
          center={[-12.04, -77.04]}
          zoom={10}
          scrollWheelZoom={false}
          className={clases.lienzo}
        >
          {teselas && (
            <TileLayer
              url={teselas}
              attribution={atribucion}
              eventHandlers={{ tileerror: () => setSinBase(true) }}
            />
          )}
          <Encuadre capa={capa} centrado={centrado} />
          {capa.features.map((entidad) => {
            const p = entidad.properties;
            const seleccionado = seleccionados.includes(p.id);
            const conflicto = conflictos.includes(p.id);
            const postal = postales.includes(p.id) || p.soloCodigosPostales;
            const inactivo = p.estado === 'INACTIVO' || capa.zona?.estado === 'INACTIVO';
            const estilo: PathOptions = {
              color: conflicto
                ? 'var(--mantine-color-red-8)'
                : seleccionado
                  ? 'var(--mantine-color-orange-8)'
                  : inactivo
                    ? 'var(--mantine-color-gray-7)'
                    : 'var(--mantine-color-indigo-7)',
              weight: seleccionado || conflicto ? 4 : 2,
              fillOpacity: postal ? 0 : seleccionado ? 0.35 : inactivo ? 0.08 : 0.14,
              dashArray: inactivo || postal ? '6 5' : undefined,
            };
            return (
              <LimiteDistrito
                key={p.id}
                entidad={entidad}
                estilo={estilo}
                alSeleccionar={alSeleccionar}
              />
            );
          })}
        </MapContainer>
      </div>
    </Stack>
  );
}
