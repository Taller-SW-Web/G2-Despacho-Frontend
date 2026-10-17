import { z } from 'zod';

const identificador = z.string().min(1);
const entero = z.number().int().nonnegative();
const numero = z.number().finite().nonnegative();
export const fechaCivil = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((fecha) => {
  const instante = new Date(`${fecha}T12:00:00Z`);
  return !fecha.startsWith('0000') && Number.isFinite(instante.valueOf()) && instante.toISOString().slice(0, 10) === fecha;
});
const instante = z.string().datetime({ offset: true });
export const esquemaCarga = z.object({ pesoKg: numero, volumenM3: numero, paquetes: entero });
export const esquemaPendiente = z.object({
  idDespacho: identificador, codigoOperativo: identificador, codigoRastreoInterno: identificador, idPedido: identificador,
  idZona: identificador, nombreZona: z.string(), direccion: z.string(), pesoTotalKg: numero, volumenTotalM3: numero,
  cantidadPaquetes: entero, fechaProgramada: fechaCivil, numeroIntentos: entero, tiempoEsperaSegundos: numero,
  esSimulacion: z.boolean(), reintento: z.boolean(), asignable: z.boolean(), disponibleDesde: fechaCivil.nullable(), versionDespacho: entero,
});
export const esquemaPagina = z.object({
  contenido: z.array(esquemaPendiente), paginaActual: entero.positive(), tamanoPagina: entero.positive().max(100),
  totalElementos: entero, totalPaginas: entero,
  indicadores: z.object({ pendientesHoy: entero, programadosFuturo: entero, reintentos: entero }),
  fechaActualServidor: fechaCivil, consultadoEn: instante,
});
export const esquemaDisponibles = z.object({ repartidores: z.array(z.object({
  idRepartidor: identificador, idJornada: identificador, nombre: identificador, idZona: identificador,
  estadoOperativo: z.enum(['DISPONIBLE', 'EN_RUTA', 'SATURADO', 'FUERA_DE_TURNO']), capacidadRemanente: esquemaCarga,
})) }).superRefine(({ repartidores }, contexto) => {
  if (new Set(repartidores.map((r) => r.idRepartidor)).size !== repartidores.length)
    contexto.addIssue({ code: z.ZodIssueCode.custom, message: 'El catálogo contiene identidades repetidas.' });
});
export const esquemaCreacion = z.object({
  idDespacho: identificador, codigoOperativo: identificador, codigoRastreoInterno: identificador,
  estado: z.literal('PENDIENTE_ASIGNACION'), esSimulacion: z.literal(true),
});
export const esquemaAsignacion = z.object({
  idDespacho: identificador, estado: z.literal('ASIGNADO'), idRepartidor: identificador,
  idJornada: identificador, posicionSecuencia: entero.positive(),
});
export const esquemaSimulacion = z.object({
  idZona: identificador.optional(), pesoKg: z.number().finite().positive().optional(),
  volumenM3: z.number().finite().positive().optional(), observaciones: z.string().trim().max(250).optional(),
});
export type Pendiente = z.infer<typeof esquemaPendiente>;
export type PaginaPendientes = z.infer<typeof esquemaPagina>;
export type RepartidorDisponible = z.infer<typeof esquemaDisponibles>['repartidores'][number];
export type SolicitudSimulacion = z.infer<typeof esquemaSimulacion>;
export type ZonaProgramacion = { id: string; nombre: string };
export type FiltrosPendientes = {
  pagina: number; tamanoPagina: number; idZona: string; fechaDesde: string; fechaHasta: string;
  tipoIntento: 'TODOS' | 'PRIMER_INTENTO' | 'REINTENTOS';
};
export const filtrosIniciales: FiltrosPendientes = { pagina: 1, tamanoPagina: 20, idZona: '', fechaDesde: '', fechaHasta: '', tipoIntento: 'TODOS' };

export function leerFiltros(parametros: URLSearchParams) {
  const filtros = { ...filtrosIniciales };
  const errores: Record<string, string> = {};
  parametros.forEach((valor, campo) => {
    if (!Object.hasOwn(filtrosIniciales, campo) || parametros.getAll(campo).length !== 1 || !valor.trim()) errores[campo] = 'Parámetro vacío, repetido o no admitido.';
  });
  for (const campo of ['pagina', 'tamanoPagina'] as const) {
    const valor = parametros.get(campo);
    if (valor !== null) {
      const numero = Number(valor);
      if (!/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(numero) || numero > (campo === 'pagina' ? 2147483647 : 100)) errores[campo] = 'Indica un entero dentro del rango permitido.';
      else filtros[campo] = numero;
    }
  }
  for (const campo of ['fechaDesde', 'fechaHasta'] as const) {
    const valor = parametros.get(campo);
    if (valor !== null) {
      filtros[campo] = valor;
      if (!fechaCivil.safeParse(valor).success) errores[campo] = 'Indica una fecha válida.';
    }
  }
  filtros.idZona = parametros.get('idZona') ?? '';
  const intento = parametros.get('tipoIntento');
  if (intento !== null) {
    if (['TODOS', 'PRIMER_INTENTO', 'REINTENTOS'].includes(intento)) filtros.tipoIntento = intento as FiltrosPendientes['tipoIntento'];
    else errores.tipoIntento = 'Selecciona un tipo de intento válido.';
  }
  if (filtros.fechaDesde && filtros.fechaHasta && filtros.fechaDesde > filtros.fechaHasta) errores.fechaHasta = 'La fecha final no puede ser anterior a la inicial.';
  return { filtros, errores };
}
export function parametrosFiltros(filtros: FiltrosPendientes) {
  const parametros = new URLSearchParams();
  for (const campo of Object.keys(filtrosIniciales) as (keyof FiltrosPendientes)[]) {
    if (filtros[campo] !== filtrosIniciales[campo]) parametros.set(campo, String(filtros[campo]));
  }
  return parametros;
}
export function diaSiguiente(fecha: string) {
  const instante = new Date(`${fecha}T12:00:00Z`);
  instante.setUTCDate(instante.getUTCDate() + 1);
  return instante.toISOString().slice(0, 10);
}
export const formatoNumero = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 20 });
export const formatoInstante = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' });
export const formatearFecha = (fecha: string) => fecha.split('-').reverse().join('/');
export function dimensionesExcedidas(repartidor: RepartidorDisponible, despacho: Pendiente) {
  const libre = repartidor.capacidadRemanente;
  return [despacho.pesoTotalKg > libre.pesoKg && 'peso', despacho.volumenTotalM3 > libre.volumenM3 && 'volumen',
    despacho.cantidadPaquetes > libre.paquetes && 'paquetes'].filter(Boolean) as string[];
}
