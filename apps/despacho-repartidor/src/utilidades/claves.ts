/**
 * Claves Idempotency-Key UUID v4. Una intención del repartidor (p. ej. entregar un despacho) conserva su clave
 * hasta obtener un resultado definitivo, así un reintento tras perder señal nunca duplica la transición.
 */
const PREFIJO = 'despacho.clave.';

/** crypto.randomUUID solo existe en contextos seguros; en http de red local se genera con getRandomValues. */
export function generarUuidV4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function almacen(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}

export function claveDeIntencion(alcance: string): string {
  const memoria = almacen();
  const existente = memoria?.getItem(PREFIJO + alcance);
  if (existente) return existente;
  const nueva = generarUuidV4();
  try { memoria?.setItem(PREFIJO + alcance, nueva); } catch { /* Sin almacenamiento, la clave vive solo en esta llamada. */ }
  return nueva;
}

export function liberarClave(alcance: string) {
  try { almacen()?.removeItem(PREFIJO + alcance); } catch { /* Nada que liberar. */ }
}
