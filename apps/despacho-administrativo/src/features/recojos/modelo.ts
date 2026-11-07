import { z } from 'zod';

const identificador = z.string().min(1);
const linea = z.object({ sku: z.string(), cantidad: z.number().int().positive() });
export const esquemaRecojo = z.object({
  idRecojo: identificador, idDespacho: identificador, codigoRastreoInterno: z.string(), estado: z.string(), esSimulado: z.boolean(),
  destinatario: z.string(), telefono: z.string(), direccion: z.string(), referencia: z.string().nullish(), distrito: z.string(), idZona: z.string().nullish(),
  lineas: z.array(linea), pesoKg: z.number().positive(), volumenM3: z.number().positive(), cantidadPaquetes: z.number().int().positive(),
  fechaProgramada: z.string().date(), idRepartidor: z.string().nullish(), idJornada: z.string().nullish(), secuenciaRuta: z.number().int().nullish(),
  numeroIntentos: z.number().int().nonnegative(), motivoFallo: z.string().nullish(), etiquetaMotivo: z.string().nullish(), idEvidencia: z.string().nullish(),
  motivoCierre: z.string().nullish(), recibidoEnCentroEn: z.string().nullish(), version: z.number().int().positive(), actualizadoEn: z.string(),
});
export const esquemaPaginaRecojos = z.object({
  contenido: z.array(esquemaRecojo), pagina: z.number().int().positive(), tamanoPagina: z.number().int().positive(),
  totalElementos: z.number().int().nonnegative(), totalPaginas: z.number().int().nonnegative(),
});
export const esquemaElegibles = z.object({ despachos: z.array(z.object({
  idDespacho: identificador, codigoRastreoInterno: z.string(), destinatario: z.string(), direccion: z.string(), distrito: z.string(),
})) });
export type Recojo = z.infer<typeof esquemaRecojo>;
export type PaginaRecojos = z.infer<typeof esquemaPaginaRecojos>;
export type DespachoElegible = z.infer<typeof esquemaElegibles>['despachos'][number];
export type AccionRecojo = 'recepcion' | 'reprogramacion' | 'cierre';
export const ESTADOS_POR_ASIGNAR = ['PENDIENTE_ASIGNACION'];
export const ESTADOS_POR_RESOLVER = ['RECOGIDO', 'FALLIDO'];
