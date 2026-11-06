import { describe, expect, it, vi } from 'vitest';
import { crearAccesoSeguridad, crearGestorSesion, ErrorSesion, type AccesoSeguridad, type Desafio, type Sesion } from '@despacho/cliente-api/sesion';

function sesion(token = 'acceso', refresco = 'refresco', roles: string[] = ['GESTOR_DESPACHO']): Sesion {
  return { accessToken: token, refreshToken: refresco, tokenType: 'Bearer', expiresIn: 900, expiraEn: Date.now() + 900000,
    usuario: { id: 'persona', nombreCompleto: 'Persona de prueba', correo: 'persona@example.test', roles } };
}
function adaptador(): AccesoSeguridad {
  return { iniciar: vi.fn(async () => sesion()), solicitar: vi.fn(async (desafio: Desafio) => ({ ...desafio, codigoVenceEn: Date.now() + 300000 })),
    verificar: vi.fn(async () => sesion()), renovar: vi.fn(async () => sesion('nuevo', 'refresco-nuevo')),
    cerrar: vi.fn(async () => {}), perfil: vi.fn(async () => ({})) };
}
describe('sesión humana compartida', () => {
  it('renueva automáticamente un minuto antes del vencimiento sin pedir login', async () => {
    vi.useFakeTimers();
    const acceso = adaptador(), gestor = crearGestorSesion(acceso);
    const detener = gestor.activar();
    try {
      await gestor.iniciar('persona@example.test', 'clave');
      await vi.advanceTimersByTimeAsync(839000);
      expect(acceso.renovar).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1000);
      expect(acceso.renovar).toHaveBeenCalledTimes(1);
      expect(gestor.obtenerToken()).toBe('nuevo');
    } finally { detener(); vi.useRealTimers(); }
  });
  it('al vencer el desafío retira el formulario OTP sin conceder sesión', async () => {
    vi.useFakeTimers();
    const acceso = adaptador();
    vi.mocked(acceso.iniciar).mockResolvedValue({ challengeToken: 'desafio', canal: 'EMAIL', venceEn: Date.now() + 300000, intentos: 3, reenviarEn: 0 });
    const gestor = crearGestorSesion(acceso), detener = gestor.activar();
    try {
      await gestor.iniciar('persona@example.test', 'clave');
      await vi.advanceTimersByTimeAsync(300000);
      expect(gestor.leer().desafio).toBeNull();
      expect(gestor.leer().aviso).toContain('El tiempo para ingresar el código terminó');
      expect(gestor.obtenerToken()).toBeNull();
    } finally { detener(); vi.useRealTimers(); }
  });
  it('el desafío no concede acceso y solicita OTP antes de aceptar al gestor', async () => {
    const acceso = adaptador();
    vi.mocked(acceso.iniciar).mockResolvedValue({ challengeToken: 'desafio', canal: 'EMAIL', venceEn: Date.now() + 300000, intentos: 3, reenviarEn: 0 });
    const gestor = crearGestorSesion(acceso, true);
    await gestor.iniciar('persona@example.test', 'clave');
    expect(gestor.obtenerToken()).toBeNull();
    expect(acceso.solicitar).toHaveBeenCalledTimes(1);
    await gestor.verificar('123456');
    expect(gestor.obtenerToken()).toBe('acceso');
  });
  it('rechaza la cuenta sin rol de gestor y revoca el refresco que recibió', async () => {
    const acceso = adaptador();
    vi.mocked(acceso.iniciar).mockResolvedValue(sesion('acceso', 'refresco', []));
    const gestor = crearGestorSesion(acceso, true);
    await expect(gestor.iniciar('persona@example.test', 'clave')).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    expect(gestor.obtenerToken()).toBeNull();
    expect(acceso.cerrar).toHaveBeenCalledWith('refresco');
  });
  it('dos rechazos del mismo JWT comparten un único refresco y el nuevo sirve para el rechazo tardío', async () => {
    const acceso = adaptador();
    let resolver!: (valor: Sesion) => void;
    vi.mocked(acceso.renovar).mockImplementation(() => new Promise(respuesta => { resolver = respuesta; }));
    const gestor = crearGestorSesion(acceso);
    await gestor.iniciar('persona@example.test', 'clave');
    const primera = gestor.recuperarToken('acceso'), segunda = gestor.recuperarToken('acceso');
    expect(acceso.renovar).toHaveBeenCalledTimes(1);
    resolver(sesion('nuevo', 'rotado'));
    expect(await primera).toBe('nuevo'); expect(await segunda).toBe('nuevo');
    expect(await gestor.recuperarToken('acceso')).toBe('nuevo');
    expect(acceso.renovar).toHaveBeenCalledTimes(1);
    await gestor.cerrar(); expect(acceso.cerrar).toHaveBeenCalledWith('rotado');
  });
  it('cerrar durante la renovación retira acceso inmediatamente y revoca también el resultado tardío', async () => {
    const acceso = adaptador();
    let resolver!: (valor: Sesion) => void;
    vi.mocked(acceso.renovar).mockImplementation(() => new Promise(respuesta => { resolver = respuesta; }));
    const gestor = crearGestorSesion(acceso);
    await gestor.iniciar('persona@example.test', 'clave');
    const renovando = gestor.renovar();
    const cerrando = gestor.cerrar();
    expect(gestor.obtenerToken()).toBeNull();
    resolver(sesion('nuevo', 'rotado'));
    await renovando; await cerrando;
    expect(gestor.obtenerToken()).toBeNull();
    expect(acceso.cerrar).toHaveBeenCalledWith('rotado');
  });
  it('un refresco incierto no se reutiliza automáticamente', async () => {
    const acceso = adaptador();
    vi.mocked(acceso.renovar).mockRejectedValue(new ErrorSesion('SIN_CONEXION', 'Sin conexión'));
    const gestor = crearGestorSesion(acceso);
    await gestor.iniciar('persona@example.test', 'clave');
    await expect(gestor.renovar()).rejects.toMatchObject({ codigo: 'SIN_CONEXION' });
    expect(gestor.leer().sesion).toBeNull();
    expect(await gestor.prepararToken()).toBeNull();
    expect(acceso.renovar).toHaveBeenCalledTimes(1);
  });
  it('un rechazo tardío de otra sesión no renueva ni cierra la nueva identidad', async () => {
    const acceso = adaptador();
    const gestor = crearGestorSesion(acceso);
    await gestor.iniciar('persona@example.test', 'clave');
    const otra = sesion('otra-persona', 'otro-refresco');
    otra.usuario = { ...otra.usuario, id: 'otra-persona' };
    vi.mocked(acceso.iniciar).mockResolvedValue(otra);
    await gestor.iniciar('otra@example.test', 'clave');
    expect(await gestor.recuperarToken('acceso')).toBeNull();
    gestor.invalidar('acceso');
    expect(gestor.obtenerToken()).toBe('otra-persona');
    expect(acceso.renovar).not.toHaveBeenCalled();
  });
  it('limpia la sesión incluso si falla el logout remoto', async () => {
    const acceso = adaptador();
    vi.mocked(acceso.cerrar).mockRejectedValue(new Error('Sin conexión'));
    const gestor = crearGestorSesion(acceso);
    await gestor.iniciar('persona@example.test', 'clave'); await gestor.cerrar();
    expect(gestor.leer()).toMatchObject({ sesion: null, motivo: 'manual' });
    expect(gestor.leer().aviso).toContain('No pudimos confirmar');
  });
});

it('el adaptador envía JSON y no guarda los tokens de G7 en almacenamiento del navegador', async () => {
  const token = `eyJhbGciOiJSUzI1NiJ9.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 }))}.firma`;
  const solicitud = vi.fn(async () => new Response(JSON.stringify({ ...sesion(token), expiraEn: undefined }), { status: 200 }));
  const guardarLocal = vi.spyOn(Storage.prototype, 'setItem');
  vi.stubGlobal('fetch', solicitud);
  try {
    const gestor = crearGestorSesion(crearAccesoSeguridad('http://seguridad.example.test'));
    await gestor.iniciar('persona@example.test', 'clave');
    expect(solicitud).toHaveBeenCalledWith('http://seguridad.example.test/api/v1/auth/login', expect.objectContaining({ body: JSON.stringify({ correo: 'persona@example.test', contrasena: 'clave' }), credentials: 'omit' }));
    expect(guardarLocal).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); guardarLocal.mockRestore(); }
});
