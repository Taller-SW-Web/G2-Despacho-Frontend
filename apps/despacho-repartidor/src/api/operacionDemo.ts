import { ErrorOperacion } from './errores';
import type { DespachoRuta, DetalleDespacho, Hitos, MotivoFallo, PuertoOperacion, ResumenJornada, RutaRepartidor } from './tipos';
import type { SesionIniciada } from '../sesion/servicioAcceso';
import { generarUuidV4 } from '../utilidades/claves';

/**
 * Demostración sin backend (VITE_MODO_DEMO=true). Aplica las mismas reglas visibles del contrato:
 * datos personales solo en ASIGNADO/EN_CAMINO, hitos crecientes y cierre con pendientes a NO_INTENTADO.
 */
export const CLAVE_DEMO = 'Ruta2026!';

type DespachoDemo = {
  id: string; codigo: string; estado: string; secuencia: number; intentos: number; motivo: string | null;
  nombre: string; telefono: string; direccion: string; referencia: string | null; distrito: string; hitos: Hitos;
};

const motivos: MotivoFallo[] = [
  ['CLIENTE_AUSENTE', 'Cliente ausente'], ['DIRECCION_NO_UBICADA', 'Dirección no localizada'],
  ['RECHAZO_DEL_PAQUETE', 'Cliente rechaza el paquete'], ['DATOS_DE_CONTACTO_ERRONEOS', 'Datos de contacto incorrectos'],
  ['ZONA_INACCESIBLE', 'Zona inaccesible o insegura'], ['PAQUETE_DANADO', 'Paquete dañado antes de la entrega'],
].map(([codigo, etiqueta]) => ({ codigo, etiqueta, seleccionableEnCampo: true, consumeIntento: true, activo: true }));

const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const minutosAntes = (minutos: number) => new Date(Date.now() - minutos * 60_000).toISOString();
const esperar = (milisegundos = 350) => new Promise((resolver) => setTimeout(resolver, milisegundos));

function despachosIniciales(): DespachoDemo[] {
  const asignadoEn = minutosAntes(150);
  const base = (id: number, codigo: string, nombre: string, direccion: string, distrito: string, referencia: string | null) => ({
    id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`, codigo, estado: 'ASIGNADO', secuencia: id, intentos: 0,
    motivo: null, nombre, telefono: '+51 987 654 321', direccion, referencia, distrito,
    hitos: { asignadoEn, enCaminoEn: null, entregadoEn: null, fallidoEn: null } as Hitos,
  });
  const entregado = base(1, 'TRK-78901', 'Lucía Fernández', 'Av. Arequipa 2450', 'Lince', null);
  entregado.estado = 'ENTREGADO';
  entregado.hitos = { asignadoEn, enCaminoEn: minutosAntes(95), entregadoEn: minutosAntes(70), fallidoEn: null };
  return [
    entregado,
    base(2, 'TRK-78904', 'Carlos Quispe', 'Jr. Pumacahua 1180', 'Jesús María', 'Frente al parque Castilla, puerta verde'),
    base(3, 'TRK-78910', 'Ana Torres', 'Calle Los Pinos 345', 'San Isidro', 'Edificio blanco, dpto. 302'),
    { ...base(4, 'TRK-78866', 'Jorge Salas', 'Av. Brasil 3021', 'Magdalena', null), intentos: 1 },
  ];
}

export async function iniciarSesionDemo(usuario: string, clave: string): Promise<SesionIniciada> {
  await esperar();
  if (!usuario.trim() || clave !== CLAVE_DEMO) throw new ErrorOperacion('validacion', 'Usuario o contraseña incorrectos.');
  return { token: 'demo', expiraEn: Date.now() + 8 * 3_600_000, usuario: usuario.trim() };
}

export function crearOperacionDemo(): PuertoOperacion {
  const idJornada = '00000000-0000-4000-8000-0000000000aa';
  let despachos = despachosIniciales();
  let cerradaEn: string | null = null;
  const evidencias = new Map<string, { idDespacho: string; tipo: string }>();
  const visibles = (estado: string) => estado === 'ASIGNADO' || estado === 'EN_CAMINO';
  const buscar = (id: string) => {
    const despacho = despachos.find((d) => d.id === id);
    if (!despacho || cerradaEn) throw new ErrorOperacion('noEncontrado', 'El despacho no pertenece a tu jornada activa o ya no está disponible.');
    return despacho;
  };
  const exigir = (despacho: DespachoDemo, estado: string) => {
    if (despacho.estado !== estado) throw new ErrorOperacion('conflicto', 'El despacho fue actualizado y ya no admite esta acción. Actualiza tu ruta.');
  };
  const actualizar = (id: string, cambio: Partial<DespachoDemo>) => { despachos = despachos.map((d) => d.id === id ? { ...d, ...cambio } : d); };
  const filaRuta = (d: DespachoDemo): DespachoRuta => ({
    idDespacho: d.id, codigoRastreoInterno: d.codigo, estado: d.estado, secuenciaRuta: d.secuencia, fechaProgramada: hoy(),
    numeroIntentos: d.intentos, maximoIntentos: 2, motivoFallo: d.motivo, hitos: d.hitos,
    destinatario: visibles(d.estado) ? d.nombre : null, direccion: visibles(d.estado) ? d.direccion : null,
    distrito: visibles(d.estado) ? d.distrito : null,
  });
  const detalle = (id: string): DetalleDespacho => {
    const d = buscar(id);
    return {
      ...filaRuta(d), idJornada,
      destinatario: visibles(d.estado) ? { nombre: d.nombre, telefono: d.telefono } : null,
      destino: visibles(d.estado) ? { direccion: d.direccion, referencia: d.referencia, departamento: 'Lima', provincia: 'Lima', distrito: d.distrito, codigoPostal: null } : null,
    };
  };

  return {
    async consultarRuta(): Promise<RutaRepartidor> {
      await esperar();
      if (cerradaEn) return { idJornada: null, fecha: hoy(), estadoOperativo: 'FUERA_DE_TURNO', despachos: [] };
      return { idJornada, fecha: hoy(), estadoOperativo: despachos.some((d) => d.estado === 'EN_CAMINO') ? 'EN_RUTA' : 'DISPONIBLE', despachos: despachos.map(filaRuta) };
    },
    async consultarDetalle(id) { await esperar(); return detalle(id); },
    async consultarResumen(): Promise<ResumenJornada> {
      await esperar();
      const fallidos = despachos.filter((d) => d.estado === 'FALLIDO');
      return {
        idJornada, fecha: hoy(), estadoJornada: cerradaEn ? 'CERRADA' : 'ACTIVA', cerradaEn,
        asignados: despachos.length, entregados: despachos.filter((d) => d.estado === 'ENTREGADO').length,
        fallidosConIntento: fallidos.filter((d) => d.motivo !== 'NO_INTENTADO').length,
        noIntentados: fallidos.filter((d) => d.motivo === 'NO_INTENTADO').length,
        pendientes: despachos.filter((d) => visibles(d.estado)).length,
        paquetesPorDevolver: fallidos.map((d) => ({ idDespacho: d.id, codigoRastreoInterno: d.codigo, direccion: d.direccion, distrito: d.distrito, motivoFallo: d.motivo })),
      };
    },
    async consultarMotivos() { await esperar(200); return motivos; },
    async iniciarTraslado(id) {
      await esperar();
      const d = buscar(id);
      if (d.estado === 'EN_CAMINO') return detalle(id);
      exigir(d, 'ASIGNADO');
      actualizar(id, { estado: 'EN_CAMINO', hitos: { ...d.hitos, enCaminoEn: new Date().toISOString() } });
      return detalle(id);
    },
    async subirEvidencia(idDespacho, tipo, foto, alProgreso) {
      for (const avance of [25, 60, 100]) { await esperar(150); alProgreso?.(avance); }
      if (foto.size > 2_097_152) throw new ErrorOperacion('validacion', 'La fotografía no cumple el formato o tamaño permitido.');
      const id = generarUuidV4();
      evidencias.set(id, { idDespacho, tipo });
      return id;
    },
    async registrarEntrega(id, _clave, datos) {
      await esperar();
      const d = buscar(id);
      if (d.estado === 'ENTREGADO') return detalle(id);
      exigir(d, 'EN_CAMINO');
      if (evidencias.get(datos.idEvidencia)?.idDespacho !== id) throw new ErrorOperacion('validacion', 'La fotografía no corresponde a este despacho.');
      actualizar(id, { estado: 'ENTREGADO', hitos: { ...d.hitos, entregadoEn: new Date().toISOString() } });
      return detalle(id);
    },
    async registrarFallo(id, _clave, datos) {
      await esperar();
      const d = buscar(id);
      if (d.estado === 'FALLIDO') return detalle(id);
      exigir(d, 'EN_CAMINO');
      if (evidencias.get(datos.idEvidencia)?.idDespacho !== id) throw new ErrorOperacion('validacion', 'La fotografía no corresponde a este despacho.');
      actualizar(id, { estado: 'FALLIDO', motivo: datos.motivo, intentos: d.intentos + 1, hitos: { ...d.hitos, fallidoEn: new Date().toISOString() } });
      return detalle(id);
    },
    async cerrarJornada() {
      await esperar(600);
      if (cerradaEn) return;
      const ahora = new Date().toISOString();
      despachos = despachos.map((d) => visibles(d.estado)
        ? { ...d, estado: 'FALLIDO', motivo: 'NO_INTENTADO', hitos: { ...d.hitos, fallidoEn: ahora } } : d);
      cerradaEn = ahora;
    },
  };
}
