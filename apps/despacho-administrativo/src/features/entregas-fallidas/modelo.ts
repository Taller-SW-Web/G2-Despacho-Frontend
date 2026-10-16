import { z } from 'zod';

const entero = z.number().int().nonnegative();
const recepcion = z.enum(['PENDIENTE_RETORNO', 'RECIBIDO_EN_CENTRO']);
const esquemaEntrega = z.object({
  idDespacho: z.string(), idIncidencia: z.string(), versionDespacho: entero,
  codigoRastreoInterno: z.string(), fechaIncidencia: z.string().datetime(),
  motivo: z.object({ codigo: z.string(), etiqueta: z.string() }),
  numeroIntentos: entero, maximoIntentos: entero.positive(), consumeIntento: z.boolean(),
  repartidor: z.object({ idRepartidor: z.string(), nombre: z.string().nullable() }), recepcion,
  jornada: z.object({ idJornada: z.string(), estado: z.enum(['ACTIVA', 'CERRADA', 'DESCONOCIDA']),
    cerradaEn: z.string().datetime().nullable(), consultadaEn: z.string().datetime().nullable() }),
  retornoAtrasado: z.boolean().nullable(), tieneEvidencia: z.boolean(), pedidoAnulado: z.boolean(),
});
export const esquemaPagina = z.object({
  contenido: z.array(esquemaEntrega), pagina: entero.positive(), tamanoPagina: entero.positive().max(100),
  totalElementos: entero, totalPaginas: entero,
  indicadores: z.object({ pendientesRetorno: entero, recibidosCentro: entero,
    retornosAtrasados: entero.nullable(), retornosSinJornadaConfirmada: entero }),
  consultadoEn: z.string().datetime(),
});
export const esquemaCatalogo = z.object({ motivos: z.array(z.object({
  codigo: z.string(), etiqueta: z.string(), seleccionableEnCampo: z.boolean(),
  consumeIntento: z.boolean(), activo: z.boolean(),
})) });

export type EntregaFallida = z.infer<typeof esquemaEntrega>;
export type PaginaFallidos = z.infer<typeof esquemaPagina>;
export type MotivoFallo = z.infer<typeof esquemaCatalogo>['motivos'][number];
export type FiltrosFallidos = {
  pagina: number; tamanoPagina: number; motivo: string; fechaDesde: string; fechaHasta: string;
  recepcion: 'TODOS' | EntregaFallida['recepcion']; soloRetornosAtrasados: boolean;
};
export const filtrosIniciales: FiltrosFallidos = {
  pagina: 1, tamanoPagina: 20, motivo: '', fechaDesde: '', fechaHasta: '', recepcion: 'TODOS', soloRetornosAtrasados: false,
};
export type ErroresFiltros = Record<string, string>;

/** Valida la URL sin convertir valores inválidos en una consulta vacía. */
export function leerFiltros(parametros: URLSearchParams): { filtros: FiltrosFallidos; errores: ErroresFiltros } {
  const filtros = { ...filtrosIniciales };
  const errores: ErroresFiltros = Object.create(null);
  for (const [campo, valor] of parametros) {
    if (!Object.hasOwn(filtrosIniciales, campo)) errores[campo] = 'El filtro de la URL no está admitido.';
    else if (parametros.getAll(campo).length > 1) errores[campo] = 'El filtro debe aparecer una sola vez.';
    else if (!valor) errores[campo] = 'El filtro no puede estar vacío.';
  }
  for (const campo of ['pagina', 'tamanoPagina'] as const) {
    const valor = parametros.get(campo);
    if (valor !== null) {
      if (!/^\d+$/.test(valor) || Number(valor) < 1 || Number(valor) > (campo === 'pagina' ? 2147483647 : 100)) errores[campo] = 'Introduce un número de página o tamaño válido.';
      else filtros[campo] = Number(valor);
    }
  }
  for (const campo of ['motivo', 'fechaDesde', 'fechaHasta'] as const) filtros[campo] = parametros.get(campo) ?? '';
  for (const campo of ['fechaDesde', 'fechaHasta'] as const) {
    const valor = filtros[campo];
    if (valor && (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor)) || new Date(valor).toISOString().slice(0, 10) !== valor)) errores[campo] = 'Introduce una fecha válida.';
  }
  if (filtros.fechaDesde && filtros.fechaHasta && filtros.fechaDesde > filtros.fechaHasta) errores.fechaHasta = 'La fecha final debe ser igual o posterior a la inicial.';
  const grupo = parametros.get('recepcion');
  if (grupo && !['TODOS', 'PENDIENTE_RETORNO', 'RECIBIDO_EN_CENTRO'].includes(grupo)) errores.recepcion = 'Selecciona una recepción válida.';
  else if (grupo) filtros.recepcion = grupo as FiltrosFallidos['recepcion'];
  const atrasados = parametros.get('soloRetornosAtrasados');
  if (atrasados && atrasados !== 'true' && atrasados !== 'false') errores.soloRetornosAtrasados = 'La selección de atrasados no es válida.';
  filtros.soloRetornosAtrasados = atrasados === 'true';
  if (filtros.soloRetornosAtrasados && filtros.recepcion === 'RECIBIDO_EN_CENTRO') errores.recepcion = 'Los retornos atrasados deben estar pendientes de retorno.';
  return { filtros, errores };
}

export function parametrosFiltros(filtros: FiltrosFallidos): URLSearchParams {
  const parametros = new URLSearchParams();
  if (filtros.pagina !== 1) parametros.set('pagina', String(filtros.pagina));
  if (filtros.tamanoPagina !== 20) parametros.set('tamanoPagina', String(filtros.tamanoPagina));
  for (const campo of ['motivo', 'fechaDesde', 'fechaHasta'] as const) if (filtros[campo]) parametros.set(campo, filtros[campo]);
  if (filtros.recepcion !== 'TODOS') parametros.set('recepcion', filtros.recepcion);
  if (filtros.soloRetornosAtrasados) parametros.set('soloRetornosAtrasados', 'true');
  return parametros;
}

export const formatoFechaLima = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});
