import axios from 'axios';
import { crearClienteApi } from '@despacho/cliente-api';
import { aErrorOperacion, ErrorOperacion } from './errores';
import {
  esquemaAutorizacionCarga, esquemaDetalle, esquemaMotivos, esquemaResumen, esquemaRuta,
  type DetalleDespacho, type PuertoOperacion,
} from './tipos';

/** Contrato de Operación §3 a través del Gateway. Los errores salen siempre como ErrorOperacion. */
export function crearOperacionHttp(urlBase: string, obtenerToken: () => string | null): PuertoOperacion {
  const cliente = crearClienteApi(urlBase, obtenerToken);
  const conClave = (clave: string) => ({ headers: { 'Idempotency-Key': clave } });
  const detalle = (idDespacho: string, datos: unknown): DetalleDespacho => {
    const resultado = esquemaDetalle.parse(datos);
    // El frontend vincula cada respuesta al recurso pedido; otra respuesta se descarta.
    if (resultado.idDespacho !== idDespacho) throw new ErrorOperacion('conflicto', 'La respuesta corresponde a otro despacho.');
    return resultado;
  };
  const ruta = (idDespacho: string, accion = '') => `/api/v1/repartidor/despachos/${encodeURIComponent(idDespacho)}${accion}`;
  async function ejecutar<T>(operacion: () => Promise<T>): Promise<T> {
    try { return await operacion(); } catch (error) { throw aErrorOperacion(error); }
  }

  return {
    consultarRuta: (signal) => ejecutar(async () =>
      esquemaRuta.parse((await cliente.get('/api/v1/repartidor/mi-ruta', { signal })).data)),
    consultarDetalle: (idDespacho, signal) => ejecutar(async () =>
      detalle(idDespacho, (await cliente.get(ruta(idDespacho), { signal })).data)),
    consultarResumen: (signal) => ejecutar(async () =>
      esquemaResumen.parse((await cliente.get('/api/v1/repartidor/jornada/resumen', { signal })).data)),
    consultarMotivos: (signal) => ejecutar(async () =>
      esquemaMotivos.parse((await cliente.get('/api/v1/repartidor/motivos-fallo', { signal })).data).motivos),
    iniciarTraslado: (idDespacho, clave) => ejecutar(async () =>
      detalle(idDespacho, (await cliente.post(ruta(idDespacho, '/inicio-traslado'), undefined, conClave(clave))).data)),
    subirEvidencia: (idDespacho, tipo, foto, alProgreso) => ejecutar(async () => {
      const autorizacion = esquemaAutorizacionCarga.parse((await cliente.post('/api/v1/repartidor/evidencias/autorizaciones', {
        idDespacho, tipo, contentType: foto.type, tamanioBytes: foto.size,
      })).data);
      // La foto va directo al bucket privado con la URL firmada; la API nunca recibe la imagen.
      await axios.put(autorizacion.urlCarga, foto, {
        headers: { 'Content-Type': foto.type, 'x-upsert': 'false' },
        timeout: 60000,
        onUploadProgress: (evento) => { if (evento.total) alProgreso?.(Math.round((evento.loaded / evento.total) * 100)); },
      });
      return autorizacion.idEvidencia;
    }),
    registrarEntrega: (idDespacho, clave, datos) => ejecutar(async () =>
      detalle(idDespacho, (await cliente.post(ruta(idDespacho, '/entrega'), datos, conClave(clave))).data)),
    registrarFallo: (idDespacho, clave, datos) => ejecutar(async () =>
      detalle(idDespacho, (await cliente.post(ruta(idDespacho, '/fallo'), datos, conClave(clave))).data)),
    cerrarJornada: (idJornada, clave) => ejecutar(async () => {
      await cliente.post('/api/v1/repartidor/jornada/cierre', { idJornada }, conClave(clave));
    }),
  };
}
