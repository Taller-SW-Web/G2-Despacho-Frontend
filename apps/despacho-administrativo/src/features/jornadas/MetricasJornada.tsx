import { SimpleGrid } from '@mantine/core';
import { BarraOcupacion } from '@despacho/componentes-compartidos';
import type { Jornada } from './modelo';

export function MetricasJornada({
  jornada,
  compacta = false,
}: {
  jornada: Jornada;
  compacta?: boolean;
}) {
  return (
    <SimpleGrid cols={1} spacing={compacta ? 'sm' : 'md'}>
      <BarraOcupacion
        metrica="peso"
        usado={jornada.ocupacion.pesoKg}
        limite={jornada.limites.pesoKg}
        variante={compacta ? 'compacta' : 'completa'}
      />
      <BarraOcupacion
        metrica="volumen"
        usado={jornada.ocupacion.volumenM3}
        limite={jornada.limites.volumenM3}
        variante={compacta ? 'compacta' : 'completa'}
      />
      <BarraOcupacion
        metrica="paquetes"
        usado={jornada.ocupacion.paquetes}
        limite={jornada.limites.paquetes}
        variante={compacta ? 'compacta' : 'completa'}
      />
    </SimpleGrid>
  );
}
