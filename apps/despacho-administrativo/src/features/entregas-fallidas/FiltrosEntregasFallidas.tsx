import { SimpleGrid, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import 'dayjs/locale/es';
import { BarraFiltros } from '@despacho/componentes-compartidos';
import type { ErroresFiltros, FiltrosFallidos, MotivoFallo } from './modelo';

const estilosCampo = { input: { minHeight: 44 } };

export function FiltrosEntregasFallidas({ filtros, motivos, errores, consultando, catalogoDisponible, alCambiar, alLimpiar }: {
  filtros: FiltrosFallidos; motivos: MotivoFallo[]; errores: ErroresFiltros; consultando: boolean; catalogoDisponible: boolean;
  alCambiar: (cambio: Partial<FiltrosFallidos>) => void; alLimpiar: () => void;
}) {
  const activos = [
    ...(filtros.motivo ? [{ id: 'motivo', etiqueta: motivos.find((motivo) => motivo.codigo === filtros.motivo)?.etiqueta ?? 'Motivo seleccionado' }] : []),
    ...(filtros.fechaDesde ? [{ id: 'fechaDesde', etiqueta: `Desde ${filtros.fechaDesde}` }] : []),
    ...(filtros.fechaHasta ? [{ id: 'fechaHasta', etiqueta: `Hasta ${filtros.fechaHasta}` }] : []),
    ...(filtros.soloRetornosAtrasados ? [{ id: 'grupo', etiqueta: 'Solo retornos atrasados' }]
      : filtros.recepcion !== 'TODOS' ? [{ id: 'grupo', etiqueta: filtros.recepcion === 'PENDIENTE_RETORNO' ? 'Pendiente de retorno' : 'Recibido en centro' }] : []),
  ];
  return <BarraFiltros activos={activos} consultando={consultando} alLimpiar={alLimpiar}
    alQuitarFiltro={(id) => alCambiar(id === 'grupo' ? { recepcion: 'TODOS', soloRetornosAtrasados: false } : { [id]: '' })}
    controles={<SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
      <Select id="filtro-motivo" label="Motivo del fallo" placeholder={catalogoDisponible ? 'Todos los motivos' : 'Catálogo no disponible'}
        size="sm" styles={estilosCampo} searchable={motivos.length > 8} clearable clearButtonProps={{ 'aria-label': 'Limpiar motivo' }} value={filtros.motivo || null} disabled={!catalogoDisponible}
        data={motivos.map((motivo) => ({ value: motivo.codigo, label: `${motivo.etiqueta}${motivo.activo ? '' : ' (inactivo)'}` }))}
        error={errores.motivo} nothingFoundMessage="Sin resultados" onChange={(valor) => alCambiar({ motivo: valor ?? '' })} />
      <DatePickerInput id="filtro-desde" label="Fecha de incidencia desde" placeholder="Sin fecha inicial" locale="es" valueFormat="DD/MM/YYYY"
        size="sm" styles={estilosCampo} clearable clearButtonProps={{ 'aria-label': 'Limpiar fecha inicial' }} value={filtros.fechaDesde || null} error={errores.fechaDesde} onChange={(valor) => alCambiar({ fechaDesde: valor ?? '' })}
        nextLabel="Mes siguiente" previousLabel="Mes anterior" />
      <DatePickerInput id="filtro-hasta" label="Fecha de incidencia hasta" placeholder="Sin fecha final" locale="es" valueFormat="DD/MM/YYYY"
        size="sm" styles={estilosCampo} clearable clearButtonProps={{ 'aria-label': 'Limpiar fecha final' }} value={filtros.fechaHasta || null} error={errores.fechaHasta} onChange={(valor) => alCambiar({ fechaHasta: valor ?? '' })}
        nextLabel="Mes siguiente" previousLabel="Mes anterior" />
      <Select id="filtro-recepcion" label="Recepción" size="sm" styles={estilosCampo} value={filtros.recepcion} allowDeselect={false} error={errores.recepcion}
        data={[{ value: 'TODOS', label: 'Todos' }, { value: 'PENDIENTE_RETORNO', label: 'Pendiente de retorno' }, { value: 'RECIBIDO_EN_CENTRO', label: 'Recibido en centro' }]}
        onChange={(valor) => valor && alCambiar({ recepcion: valor as FiltrosFallidos['recepcion'], soloRetornosAtrasados: false })} />
    </SimpleGrid>} />;
}
