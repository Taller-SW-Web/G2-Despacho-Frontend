import { ZONA_HORARIA } from '../config';

const hora = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA_HORARIA });

/** Instante ISO del backend a HH:mm en la zona operativa; null si no hay marca. */
export function formatearHora(instante: string | null | undefined): string | null {
  if (!instante) return null;
  const fecha = new Date(instante);
  return Number.isNaN(fecha.getTime()) ? null : hora.format(fecha);
}

/** yyyy-MM-dd a dd/MM/yyyy sin conversiones de zona: es una fecha civil. */
export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const [anio, mes, dia] = fecha.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
}

/** Intento que se juega ahora: el contador guarda los consumidos, y un despacho pendiente va por el siguiente. */
export function intentoEnCurso(numeroIntentos: number, estado: string): number {
  return estado === 'ASIGNADO' || estado === 'EN_CAMINO' ? numeroIntentos + 1 : Math.max(numeroIntentos, 1);
}

export function etiquetaIntento(numeroIntentos: number, maximo: number | null, estado: string): string {
  const actual = intentoEnCurso(numeroIntentos, estado);
  return maximo ? `Intento ${actual} de ${maximo}` : `Intento ${actual}`;
}

export function formatearTamano(bytes: number): string {
  return bytes < 1_048_576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`;
}
