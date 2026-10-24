/** Origen público del Gateway; las rutas incluyen /api/v1. */
export const URL_API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

/**
 * Origen del módulo Seguridad y Usuarios para el acceso humano. Por defecto se usa el Gateway, que en local
 * enruta /api/v1/auth/login a seguridad-local. Cuando Seguridad publique su servicio, basta cambiar esta variable.
 */
export const URL_SEGURIDAD = import.meta.env.VITE_SEGURIDAD_URL ?? URL_API;

/** Demostración sin backend: datos y operaciones en memoria, nunca contra servicios reales. */
export const MODO_DEMO = import.meta.env.VITE_MODO_DEMO === 'true';

/** Política de evidencia del contrato de Operación §3.2. */
export const POLITICA_EVIDENCIA = {
  tiposPermitidos: ['image/jpeg', 'image/png', 'image/webp'],
  maximoBytes: 2_097_152,
} as const;

/** Las horas se muestran en la zona operativa del módulo. */
export const ZONA_HORARIA = 'America/Lima';
