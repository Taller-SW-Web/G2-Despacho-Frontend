import { z } from 'zod';

export const turnos = [
  { value: 'MANANA', label: 'Mañana' }, { value: 'TARDE', label: 'Tarde' }, { value: 'COMPLETO', label: 'Completo' },
];
export const estadosFurgoneta = [
  { value: 'DISPONIBLE', label: 'Disponible' }, { value: 'EN_MANTENIMIENTO', label: 'En mantenimiento' },
  { value: 'FUERA_DE_SERVICIO', label: 'Fuera de servicio' },
];
export const registros = [{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }];
export const vinculaciones = [{ value: 'PENDIENTE', label: 'Pendiente' }, { value: 'VINCULADO', label: 'Vinculado' }];
export const etiquetasTurno = Object.fromEntries(turnos.map(({ value, label }) => [value, label]));

const identificador = z.string().trim().min(1);
const texto = (maximo: number) => z.string().trim().min(1, 'Completa este campo.').max(maximo, `Usa como máximo ${maximo} caracteres.`);
export const datosContacto = z.object({
  telefono: texto(20).regex(/^\+?[\d ()-]{6,20}$/, 'Ingresa un teléfono válido.').refine((valor) => (valor.match(/\d/g)?.length ?? 0) >= 6, 'Ingresa un teléfono válido.'),
  correo: texto(120).email('Ingresa un correo válido.'),
  numeroBrevete: texto(20),
  turnoHabitual: z.enum(['MANANA', 'TARDE', 'COMPLETO'], { message: 'Selecciona un turno.' }),
});
export const datosRepartidor = datosContacto.extend({
  nombres: texto(80), apellidos: texto(80), dni: z.string().regex(/^\d{8}$/, 'Ingresa un DNI de 8 dígitos.'),
});
function admiteDecimales(valor: number, maximo: number): boolean {
  const [coeficiente, exponente = '0'] = valor.toString().toLowerCase().split('e');
  return Math.max(0, (coeficiente.split('.')[1]?.length ?? 0) - Number(exponente)) <= maximo;
}
export const limitesFurgoneta = z.object({
  capacidadPesoKg: z.number({ message: 'Ingresa el peso.' }).finite().positive('El peso debe ser mayor que cero.')
    .max(9999999.999, 'El peso no puede superar 9999999.999 kg.')
    .refine((valor) => admiteDecimales(valor, 3), 'Usa como máximo 3 decimales para el peso.'),
  capacidadVolumenM3: z.number({ message: 'Ingresa el volumen.' }).finite().positive('El volumen debe ser mayor que cero.')
    .max(999999.9999, 'El volumen no puede superar 999999.9999 m³.')
    .refine((valor) => admiteDecimales(valor, 4), 'Usa como máximo 4 decimales para el volumen.'),
  maximoPaquetes: z.number({ message: 'Ingresa el máximo de paquetes.' }).int('Ingresa una cantidad entera.')
    .positive('La cantidad debe ser mayor que cero.').max(32767, 'El máximo permitido es 32767 paquetes.'),
});
export const datosFurgoneta = limitesFurgoneta.extend({ placa: texto(10) });
export const datosVinculacion = z.object({ usuarioId: z.string().trim().uuid('Ingresa el identificador UUID comunicado por Seguridad.') });

// Transporte definido por Operación §4.1; se conserva la presentación neutral de estados futuros.
// Los estados desconocidos se conservan solo para resolver una etiqueta neutral en CR-09.
export const repartidorRecibido = z.object({
  idRepartidor: identificador, nombres: z.string(), apellidos: z.string(), dni: z.string(),
  telefono: z.string(), correo: z.string(), numeroBrevete: z.string(), turnoHabitual: z.string(),
  estadoRegistro: z.string(), estadoVinculacion: z.string(), usuarioId: z.string().nullable().optional(),
});
export const furgonetaRecibida = z.object({
  idFurgoneta: identificador, placa: z.string(), estado: z.string(),
  capacidadPesoKg: z.number().finite().positive(), capacidadVolumenM3: z.number().finite().positive(),
  maximoPaquetes: z.number().int().positive(),
});
export type Repartidor = z.infer<typeof repartidorRecibido>;
export type Furgoneta = z.infer<typeof furgonetaRecibida>;
export type DatosRepartidor = z.infer<typeof datosRepartidor>;
export type DatosContacto = z.infer<typeof datosContacto>;
export type DatosFurgoneta = z.infer<typeof datosFurgoneta>;
export type LimitesFurgoneta = z.infer<typeof limitesFurgoneta>;
export type EstadoFurgoneta = 'DISPONIBLE' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO';
export type Pagina<T> = { contenido: T[]; pagina: number; tamanoPagina: number; totalElementos: number; totalPaginas: number };
export function esquemaPagina<T extends z.ZodTypeAny>(fila: T) {
  return z.object({ contenido: z.array(fila), pagina: z.number().int().positive(), tamanoPagina: z.number().int().positive(),
    totalElementos: z.number().int().nonnegative(), totalPaginas: z.number().int().nonnegative() }).superRefine((pagina, contexto) => {
    const totalPaginas = Math.ceil(pagina.totalElementos / pagina.tamanoPagina);
    const filasEsperadas = Math.max(0, Math.min(pagina.tamanoPagina, pagina.totalElementos - (pagina.pagina - 1) * pagina.tamanoPagina));
    if (pagina.totalPaginas !== totalPaginas || pagina.contenido.length !== filasEsperadas) {
      contexto.addIssue({ code: 'custom', message: 'La paginación recibida no es coherente.' });
    }
  });
}
export function transicionesFurgoneta(estado: string): EstadoFurgoneta[] {
  if (estado === 'DISPONIBLE') return ['EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO'];
  if (estado === 'EN_MANTENIMIENTO') return ['DISPONIBLE', 'FUERA_DE_SERVICIO'];
  return estado === 'FUERA_DE_SERVICIO' ? ['DISPONIBLE'] : [];
}
export function erroresCampos(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(error.issues.map((problema) => [String(problema.path[0]), problema.message]));
}
