import { useEffect, useState } from 'react';
import { Select, SimpleGrid, TextInput } from '@mantine/core';
import { BarraFiltros } from '@despacho/componentes-compartidos';
import type { DefinicionFiltro, FiltrosCatalogo } from './useCatalogoFlota';

function BuscadorPlaca({ valor, alCambiar }: { valor: string; alCambiar: (valor: string) => void }) {
  const [texto, establecerTexto] = useState(valor);
  useEffect(() => {
    if (texto === valor) return;
    const temporizador = setTimeout(() => alCambiar(texto.trim().toUpperCase()), 300);
    return () => clearTimeout(temporizador);
  }, [texto, valor, alCambiar]);
  return <TextInput label="Placa" value={texto} maxLength={10} onChange={(evento) => establecerTexto(evento.currentTarget.value)} />;
}
export function FiltrosFlota({ definiciones, filtros, consultando, alCambiar, alLimpiar }: {
  definiciones: DefinicionFiltro[]; filtros: FiltrosCatalogo; consultando: boolean;
  alCambiar: (cambios: FiltrosCatalogo) => void; alLimpiar: () => void;
}) {
  return <BarraFiltros consultando={consultando} alLimpiar={alLimpiar} alQuitarFiltro={(id) => alCambiar({ [id]: '' })}
    activos={definiciones.filter(({ clave }) => filtros[clave]).map(({ clave, etiqueta, opciones }) => ({ id: clave,
      etiqueta: `${etiqueta}: ${opciones?.find(({ value }) => value === filtros[clave])?.label ?? (opciones ? 'Valor no disponible' : filtros[clave])}` }))}
    controles={<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {definiciones.map(({ clave, etiqueta, opciones }) => opciones
        ? <Select key={clave} label={etiqueta} value={filtros[clave] || null} placeholder="Todos" clearable data={opciones}
          onChange={(valor) => alCambiar({ [clave]: valor ?? '' })} />
        : <BuscadorPlaca key={`${clave}:${filtros[clave]}`} valor={filtros[clave]} alCambiar={(valor) => alCambiar({ [clave]: valor })} />)}
    </SimpleGrid>} />;
}
