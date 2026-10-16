const ZONA_OPERATIVA = 'America/Lima';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-PE', {
  timeZone: ZONA_OPERATIVA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-PE', {
  timeZone: ZONA_OPERATIVA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatearFecha(instante?: string | null): string {
  if (!instante) return '—';
  const fecha = new Date(instante);
  return Number.isNaN(fecha.getTime()) ? '—' : FORMATO_FECHA.format(fecha);
}

export function formatearFechaHora(instante?: string | null): string {
  if (!instante) return '—';
  const fecha = new Date(instante);
  return Number.isNaN(fecha.getTime()) ? '—' : FORMATO_FECHA_HORA.format(fecha);
}

export function formatearMoneda(valor?: number | null, moneda = 'PEN'): string {
  if (valor === null || valor === undefined) return 'Sin tarifa';
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(valor);
}

/** Las fechas civiles del contrato usan `YYYY-MM-DD`; no se convierten a UTC. */
export function formatearFechaCivil(valor?: string | null): string {
  if (!valor) return '—';
  const [anio, mes, dia] = valor.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : valor;
}
