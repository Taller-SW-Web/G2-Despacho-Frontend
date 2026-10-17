import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { ActionIcon, Button, Group, Loader, Paper, Pill, Stack, Text, TextInput } from '@mantine/core';
import { IconFilterOff, IconSearch, IconX } from '@tabler/icons-react';
import type { FiltroActivoUi } from '../tipos-ui';
import clases from './BarraFiltros.module.css';

type BusquedaControlada = {
  busqueda: string;
  etiquetaBusqueda: string;
  alCambiarBusqueda: (valor: string) => void;
  alConsultarBusqueda: (valor: string) => void;
} | {
  busqueda?: undefined;
  etiquetaBusqueda?: never;
  alCambiarBusqueda?: never;
  alConsultarBusqueda?: never;
};

export type PropiedadesBarraFiltros = BusquedaControlada & {
  controles?: ReactNode;
  activos?: FiltroActivoUi[];
  consultando?: boolean;
  alQuitarFiltro: (id: string) => void;
  alLimpiar: () => void;
};

/** CR-06: debounce de edición; URL, peticiones y respuestas fuera de orden son del contenedor. */
export function BarraFiltros({ busqueda, etiquetaBusqueda, alCambiarBusqueda, alConsultarBusqueda,
  controles, activos = [], consultando = false, alQuitarFiltro, alLimpiar }: PropiedadesBarraFiltros) {
  const idBusqueda = useId();
  const pendiente = useRef<{ temporizador: ReturnType<typeof setTimeout>; valor: string } | null>(null);
  const consultar = useRef(alConsultarBusqueda);
  useEffect(() => { consultar.current = alConsultarBusqueda; }, [alConsultarBusqueda]);

  function cancelarPendiente() {
    if (pendiente.current) clearTimeout(pendiente.current.temporizador);
    pendiente.current = null;
  }

  // Un cambio externo (por ejemplo, restaurar la URL) invalida la edición pendiente.
  useEffect(() => {
    if (pendiente.current && pendiente.current.valor !== busqueda) cancelarPendiente();
  }, [busqueda]);
  useEffect(() => cancelarPendiente, []);

  function editar(valor: string) {
    cancelarPendiente();
    alCambiarBusqueda?.(valor);
    pendiente.current = { valor, temporizador: setTimeout(() => {
      pendiente.current = null;
      consultar.current?.(valor);
    }, 300) };
  }

  return <Paper component="section" aria-label="Filtros de consulta" p="md" radius="md" withBorder bg="cloud.2">
    <Stack gap="md">
      <div className={clases.controles}>
        {busqueda !== undefined && <TextInput id={idBusqueda} label={etiquetaBusqueda} value={busqueda}
          size="sm" className={clases.busqueda} classNames={{ input: clases.entrada }}
          leftSection={<IconSearch size={20} aria-hidden="true" />} onChange={(evento) => editar(evento.currentTarget.value)}
          rightSectionWidth={busqueda ? 80 : 44}
          rightSection={<Group gap="xs" wrap="nowrap">
            {consultando && <Loader size={16} aria-hidden="true" />}
            {busqueda && <ActionIcon type="button" size="xl" variant="subtle" color="orange.8" aria-label="Limpiar búsqueda" onClick={() => {
              cancelarPendiente();
              alCambiarBusqueda?.('');
              consultar.current?.('');
            }}><IconX size={20} aria-hidden="true" /></ActionIcon>}
          </Group>} />}
        {controles && <div className={clases.adicionales}>{controles}</div>}
      </div>
      <Group justify="space-between" align="flex-start">
        <Group gap="xs" className={clases.activos}>
          {activos.map(({ id, etiqueta }) => <Pill key={id} withRemoveButton h={44}
            removeButtonProps={{ 'aria-label': `Quitar ${etiqueta}`, 'aria-hidden': false, tabIndex: 0, w: 44, h: 44 }}
            onRemove={() => { cancelarPendiente(); alQuitarFiltro(id); }}>{etiqueta}</Pill>)}
          {consultando && <Text size="sm" c="dimmed" role="status">Consultando…</Text>}
        </Group>
        <Button type="button" variant="subtle" color="orange.8" bg="cloud.1" size="sm" mih={44}
          leftSection={<IconFilterOff size={16} aria-hidden="true" />} disabled={!activos.length && !busqueda}
          onClick={() => { cancelarPendiente(); alLimpiar(); }}>Limpiar filtros</Button>
      </Group>
    </Stack>
  </Paper>;
}
