import type { Furgoneta, Pagina, Repartidor } from './modelo';

// Datos sintéticos para presentación. No representan respuestas verificadas de un backend.
export const repartidorPrueba: Repartidor = { idRepartidor: 'rep/1', nombres: 'Ana', apellidos: 'Prueba', dni: '12345678', telefono: '999111222',
  correo: 'ana@example.test', numeroBrevete: 'Q12345678', turnoHabitual: 'MANANA', estadoRegistro: 'ACTIVO', estadoVinculacion: 'PENDIENTE', usuarioId: null };
export const furgonetaPrueba: Furgoneta = { idFurgoneta: 'fur/1', placa: 'ABC-123', estado: 'DISPONIBLE', capacidadPesoKg: 500, capacidadVolumenM3: 4, maximoPaquetes: 80 };
export const paginaPrueba = <T,>(contenido: T[], pagina = 1, tamanoPagina = 50, totalElementos = contenido.length): Pagina<T> =>
  ({ contenido, pagina, tamanoPagina, totalElementos, totalPaginas: Math.ceil(totalElementos / tamanoPagina) });
export const falloPrueba = (status: number, errores: unknown[] = []) => ({ isAxiosError: true,
  response: { status, data: { status, detail: 'Traza interna que nunca debe mostrarse.', errores } } });
