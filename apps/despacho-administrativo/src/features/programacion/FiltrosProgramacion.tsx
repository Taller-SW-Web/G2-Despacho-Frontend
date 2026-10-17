import { Chip, Group, Select, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import 'dayjs/locale/es';
import { BarraFiltros } from '@despacho/componentes-compartidos';
import type { FiltrosPendientes, ZonaProgramacion } from './modelo';
import clases from './Programacion.module.css';

export function FiltrosProgramacion({ filtros, zonas, consultando, errores, alCambiar, alLimpiar }: {
  filtros: FiltrosPendientes; zonas: ZonaProgramacion[]; consultando: boolean; errores: Record<string, string>;
  alCambiar: (cambio: Partial<FiltrosPendientes>) => void; alLimpiar: () => void;
}) {
  const activos = [
    ...(filtros.idZona ? [{ id: 'idZona', etiqueta: zonas.find((z) => z.id === filtros.idZona)?.nombre ?? 'Zona seleccionada' }] : []),
    ...(filtros.fechaDesde ? [{ id: 'fechaDesde', etiqueta: `Desde ${filtros.fechaDesde}` }] : []),
    ...(filtros.fechaHasta ? [{ id: 'fechaHasta', etiqueta: `Hasta ${filtros.fechaHasta}` }] : []),
    ...(filtros.tipoIntento !== 'TODOS' ? [{ id: 'tipoIntento', etiqueta: filtros.tipoIntento === 'REINTENTOS' ? 'Reintentos' : 'Primer intento' }] : []),
  ];
  const opciones = zonas.map((z) => ({ value: z.id, label: z.nombre }));
  if (filtros.idZona && !opciones.some((z) => z.value === filtros.idZona)) opciones.push({ value: filtros.idZona, label: 'Zona seleccionada (fuera del catálogo activo)' });
  return <BarraFiltros consultando={consultando} activos={activos} alLimpiar={alLimpiar}
    alQuitarFiltro={(campo) => alCambiar({ [campo]: campo === 'tipoIntento' ? 'TODOS' : '' })}
    controles={<div className={clases.filtros}>
      <DatePickerInput type="range" allowSingleDateInRange clearable label="Fecha programada" placeholder="Desde – hasta" size="sm" locale="es"
        className={clases.fecha} value={[filtros.fechaDesde || null, filtros.fechaHasta || null]}
        onChange={([desde, hasta]) => alCambiar({ fechaDesde: desde ?? '', fechaHasta: hasta ?? '' })}
        error={errores.fechaDesde || errores.fechaHasta} styles={{ input: { minHeight: 44 } }} />
      <Select label="Zona" placeholder="Todas las zonas" size="sm" searchable clearable data={opciones} className={clases.zona}
        value={filtros.idZona || null} onChange={(id) => alCambiar({ idZona: id ?? '' })} error={errores.idZona} styles={{ input: { minHeight: 44 } }} />
      <Stack gap="xs" className={clases.intentos}><Text component="span" id="etiqueta-intentos" size="sm" fw={600}>Tipo de intento</Text>
        <Chip.Group value={filtros.tipoIntento} onChange={(valor) => alCambiar({ tipoIntento: valor as FiltrosPendientes['tipoIntento'] })}>
          <Group gap="sm" aria-labelledby="etiqueta-intentos" role="group">{[
            ['TODOS', 'Todos'], ['PRIMER_INTENTO', 'Primer intento'], ['REINTENTOS', 'Reintentos'],
          ].map(([valor, etiqueta]) => <Chip key={valor} value={valor} color="orange.7"
            styles={{ label: { minHeight: 44, color: 'var(--ia-color-text-primary)' }, iconWrapper: { color: 'var(--ia-color-text-primary)' } }}>{etiqueta}</Chip>)}</Group>
        </Chip.Group>
      </Stack>
    </div>} />;
}
