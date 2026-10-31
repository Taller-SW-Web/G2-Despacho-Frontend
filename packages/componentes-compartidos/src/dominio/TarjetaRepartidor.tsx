import { useId } from 'react';
import type { ReactNode } from 'react';
import { Box, Group, Radio, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { BadgeEstado } from './BadgeEstado';
import { BarraOcupacion } from './BarraOcupacion';
import type { PropiedadesBarraOcupacion } from './BarraOcupacion';
import clases from './TarjetaRepartidor.module.css';

type MetricaRepartidor = Omit<PropiedadesBarraOcupacion, 'variante'>;

export type PropiedadesTarjetaRepartidor = {
  idRepartidor: string;
  nombre: string;
  placa: string;
  zona: string;
  estadoOperativo: unknown;
  seleccionada?: boolean;
  disabled?: boolean;
  motivoDeshabilitado?: string;
  alSeleccionar: (idRepartidor: string) => void;
} & ({
  metricas: [MetricaRepartidor & { metrica: 'peso' }, MetricaRepartidor & { metrica: 'volumen' }, MetricaRepartidor & { metrica: 'paquetes' }];
  detalleCapacidad?: never;
} | {
  /** Para proveedores que solo publican remanente: no fabricar usados/límites. */
  metricas?: never;
  detalleCapacidad: ReactNode;
});

/** CR-20: usar dentro de Radio.Group con label="Repartidor" y valor controlado. */
export function TarjetaRepartidor({ idRepartidor, nombre, placa, zona, estadoOperativo, metricas, detalleCapacidad,
  seleccionada = false, disabled = false, motivoDeshabilitado, alSeleccionar }: PropiedadesTarjetaRepartidor) {
  const id = useId();
  return <Radio.Card value={idRepartidor} checked={seleccionada && !disabled} disabled={disabled} data-bloqueo-funcional={disabled && Boolean(motivoDeshabilitado) || undefined}
    type="button" radius="md" p="md" className={clases.tarjeta}
    aria-labelledby={`${id}-nombre`} aria-describedby={`${id}-detalle${disabled && motivoDeshabilitado ? ` ${id}-motivo` : ''}`}
    onClick={() => { if (!disabled) alSeleccionar(idRepartidor); }}
    onKeyDownCapture={(evento) => {
      // Radio.Card de Mantine 9.6.2 no salta candidatos disabled al usar flechas.
      const direcciones: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (!Object.hasOwn(direcciones, evento.key)) return;
      const grupo = evento.currentTarget.closest('[role="radiogroup"]');
      if (!grupo) return;
      evento.preventDefault();
      evento.stopPropagation();
      const candidatas = Array.from(grupo.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'));
      const indice = candidatas.indexOf(evento.currentTarget);
      const siguiente = candidatas[(indice + direcciones[evento.key] + candidatas.length) % candidatas.length];
      siguiente?.focus();
      siguiente?.click();
    }}>
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Group gap="sm" wrap="nowrap" className={clases.identidad}>
          <Radio.Indicator disabled={disabled} aria-hidden="true" />
          <Text id={`${id}-nombre`} fw={600} size="lg" className={clases.nombre}>{nombre}</Text>
        </Group>
        <BadgeEstado contexto="operacionRepartidor" valor={estadoOperativo} />
      </Group>
      <Text id={`${id}-detalle`} size="sm" c="gray.7"><span className="ia-num">{placa}</span> · {zona}</Text>
      <Stack gap="md">
        {metricas ? metricas.map((metrica) => <BarraOcupacion key={metrica.metrica} {...metrica} />) : detalleCapacidad}
      </Stack>
      {disabled && motivoDeshabilitado && <Box id={`${id}-motivo`} className={clases.motivo}>
        <IconAlertCircle size={20} aria-hidden="true" />
        <Text size="sm">{motivoDeshabilitado}</Text>
      </Box>}
    </Stack>
  </Radio.Card>;
}
