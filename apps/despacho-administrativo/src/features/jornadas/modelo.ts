import { z } from 'zod';
import { esquemaPagina } from '../flota/modelo';

export const estadosOperativos = ['DISPONIBLE', 'EN_RUTA', 'SATURADO', 'FUERA_DE_TURNO'] as const;
const numero = z.number().finite();
const cantidad = numero.nonnegative();
const uuid = z.string().uuid();
export const capacidad = z.object({ pesoKg: cantidad, volumenM3: cantidad, paquetes: cantidad.int() });
export const jornadaRecibida = z.object({
  idJornada: uuid, idRepartidor: uuid, idFurgoneta: uuid, placa: z.string(), idZona: uuid,
  fecha: z.string().date(), estado: z.string(), cerradaEn: z.string().datetime({ offset: true }).nullable(),
  limites: capacidad.refine((valor) => valor.pesoKg > 0 && valor.volumenM3 > 0 && valor.paquetes > 0),
  ocupacion: capacidad,
  capacidadRemanente: z.object({ pesoKg: numero, volumenM3: numero, paquetes: numero.int() }),
  porcentajeOcupacion: z.object({ peso: cantidad, volumen: cantidad, paquetes: cantidad }),
});
export const filaMonitoreo = z.object({ idRepartidor: uuid, nombre: z.string(), estadoOperativo: z.string(), jornada: jornadaRecibida.nullable() })
  .refine((fila) => !fila.jornada || fila.jornada.idRepartidor === fila.idRepartidor, 'Jornada de otro perfil.');
export const monitoreoRecibido = esquemaPagina(filaMonitoreo).and(z.object({
  resumen: z.object({ disponible: cantidad.int(), enRuta: cantidad.int(), saturado: cantidad.int(), fueraDeTurno: cantidad.int() }),
  consultadoEn: z.string().datetime({ offset: true }),
}));
export const detalleRecibido = jornadaRecibida.and(z.object({ despachos: z.array(z.object({
  idDespacho: uuid, estado: z.string(), secuenciaRuta: z.number().int().nullable(),
})) }));
export const apertura = z.object({ idRepartidor: uuid, idFurgoneta: uuid, idZona: uuid, fecha: z.string().date() });
export const disponibilidadRecibida = z.object({ repartidores: z.array(z.object({
  idRepartidor: uuid, idJornada: uuid, nombre: z.string(), idZona: uuid, idFurgoneta: uuid, placa: z.string(),
  estadoOperativo: z.enum(['DISPONIBLE', 'EN_RUTA']), limites: capacidad, ocupacion: capacidad,
  capacidadRemanente: capacidad.refine((valor) => valor.pesoKg > 0 && valor.volumenM3 > 0 && valor.paquetes > 0),
  porcentajeOcupacion: z.object({ peso: cantidad, volumen: cantidad, paquetes: cantidad }),
})) });
export type Jornada = z.infer<typeof jornadaRecibida>;
export type Monitoreo = z.infer<typeof monitoreoRecibido>;
export type FilaMonitoreo = z.infer<typeof filaMonitoreo>;
export type Apertura = z.infer<typeof apertura>;

export function fechaBogota(instante = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instante);
  const parte = (tipo: string) => partes.find((valor) => valor.type === tipo)?.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}
export function validarParametros(parametros: URLSearchParams): string[] {
  const errores: string[] = [];
  const pagina = Number(parametros.get('pagina') ?? '1'), tamano = Number(parametros.get('tamanoPagina') ?? '50');
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > 2147483647) errores.push('Revisa la página solicitada.');
  if (![20, 50, 100].includes(tamano)) errores.push('Selecciona un tamaño de página válido.');
  if (parametros.has('fecha') && !z.string().date().safeParse(parametros.get('fecha')).success) errores.push('Revisa la fecha.');
  if (parametros.has('estadoOperativo') && !estadosOperativos.includes(parametros.get('estadoOperativo') as typeof estadosOperativos[number])) errores.push('Revisa el estado operativo.');
  if (parametros.has('idZona') && !uuid.safeParse(parametros.get('idZona')).success) errores.push('Revisa el identificador de zona.');
  return errores;
}
