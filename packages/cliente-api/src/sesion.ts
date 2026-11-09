/** Contrato humano G7: kit §7 y OpenAPI v1.1.0 (copia de trabajo, publicación pendiente). */
export type UsuarioSesion = { id: string; nombreCompleto: string; correo: string; roles: string[] };
export type Sesion = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  usuario: UsuarioSesion;
  expiraEn: number;
};
export type Desafio = {
  challengeToken: string;
  canal: 'EMAIL' | 'SMS';
  venceEn: number;
  codigoVenceEn?: number;
  destino?: string;
  intentos: number;
  reenviarEn: number;
  codigoPrueba?: string;
};
export type EstadoSesion = {
  sesion: Sesion | null;
  desafio: Desafio | null;
  motivo: 'manual' | 'expirada' | null;
  aviso: string | null;
};

export class ErrorSesion extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
    public estado = 0,
    public intentosRestantes?: number,
    public reintentarEn = 0,
  ) {
    super(mensaje);
  }
}

const mensajes: Record<string, string> = {
  CREDENCIALES_INVALIDAS: 'El correo o la contraseña no son correctos.',
  CODIGO_INVALIDO: 'El código no es correcto.',
  OTP_INTENTOS_AGOTADOS: 'Agotaste los intentos para este código. Pide uno nuevo.',
  OTP_EXPIRADO: 'El código venció. Pide uno nuevo.',
  TOKEN_INVALIDO: 'El tiempo para ingresar el código terminó. Inicia sesión de nuevo.',
  REFRESCO_INVALIDO: 'Tu sesión terminó. Inicia sesión de nuevo.',
  PASSWORD_CADUCADA: 'Tu contraseña caducó. Restablécela desde Seguridad para continuar.',
  DEMASIADAS_SOLICITUDES: 'Pediste varios códigos seguidos. Espera antes de pedir otro.',
  SIN_PERMISO: 'Esta cuenta no tiene el rol de Gestor de Despacho.',
};
type Datos = Record<string, unknown>;
function objeto(valor: unknown): Datos {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor))
    throw new ErrorSesion('RESPUESTA_INVALIDA', 'Seguridad devolvió una respuesta no compatible.');
  return valor as Datos;
}
function texto(valor: unknown): string {
  if (typeof valor !== 'string' || !valor)
    throw new ErrorSesion('RESPUESTA_INVALIDA', 'Seguridad devolvió una respuesta incompleta.');
  return valor;
}
function segundos(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0)
    throw new ErrorSesion('RESPUESTA_INVALIDA', 'Seguridad devolvió una vigencia no válida.');
  return valor;
}
function leerSesion(valor: unknown): Sesion {
  const datos = objeto(valor),
    usuario = objeto(datos.usuario);
  if (
    datos.tokenType !== 'Bearer' ||
    !Array.isArray(usuario.roles) ||
    !usuario.roles.every((rol) => typeof rol === 'string')
  ) {
    throw new ErrorSesion('RESPUESTA_INVALIDA', 'Seguridad devolvió una sesión no compatible.');
  }
  const accessToken = texto(datos.accessToken);
  let expiraEn = Date.now() + segundos(datos.expiresIn) * 1000;
  // Solo lectura de vigencia para la UI. La firma y autorización las comprueba el backend.
  try {
    const parte = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(parte));
    if (typeof claims.exp === 'number') expiraEn = Math.min(expiraEn, claims.exp * 1000);
  } catch {
    throw new ErrorSesion('RESPUESTA_INVALIDA', 'Seguridad no devolvió un JWT de acceso válido.');
  }
  if (expiraEn <= Date.now())
    throw new ErrorSesion('REFRESCO_INVALIDO', mensajes.REFRESCO_INVALIDO, 401);
  return {
    accessToken,
    refreshToken: texto(datos.refreshToken),
    tokenType: 'Bearer',
    expiresIn: segundos(datos.expiresIn),
    expiraEn,
    usuario: {
      id: texto(usuario.id),
      nombreCompleto: texto(usuario.nombreCompleto),
      correo: texto(usuario.correo),
      roles: usuario.roles as string[],
    },
  };
}

/** Transporte aislado: origen sin /api/v1. No almacena credenciales ni reintenta operaciones. */
export function crearAccesoSeguridad(origen: string, buzonLocal?: string) {
  const base = `${origen.replace(/\/+$/, '')}/api/v1/auth`;
  async function llamar(ruta: string, cuerpo?: Datos, token?: string): Promise<unknown> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${base}${ruta}`, {
        method: cuerpo ? 'POST' : 'GET',
        headers: {
          Accept: 'application/json',
          ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
        cache: 'no-store',
        credentials: 'omit',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ErrorSesion(
        'SIN_CONEXION',
        'No pudimos conectar con Seguridad. Revisa tu conexión e inténtalo de nuevo.',
      );
    }
    if (respuesta.status === 204) return null;
    const datos = (await respuesta.json().catch(() => ({}))) as Datos;
    if (!respuesta.ok) {
      const codigo = typeof datos.code === 'string' ? datos.code : 'NO_DISPONIBLE';
      const intentos =
        typeof datos.intentosRestantes === 'number' ? datos.intentosRestantes : undefined;
      const espera = Number(respuesta.headers.get('Retry-After'));
      throw new ErrorSesion(
        codigo,
        mensajes[codigo] ?? 'No se pudo completar la solicitud. Inténtalo nuevamente.',
        respuesta.status,
        intentos,
        Number.isFinite(espera) && espera > 0 ? Date.now() + espera * 1000 : 0,
      );
    }
    return datos;
  }
  return {
    async iniciar(correo: string, contrasena: string): Promise<Sesion | Desafio> {
      const datos = objeto(await llamar('/login', { correo: correo.trim(), contrasena }));
      if (datos.mfaRequerido === true)
        return {
          challengeToken: texto(datos.challengeToken),
          canal: datos.canal === 'SMS' ? 'SMS' : 'EMAIL',
          venceEn: Date.now() + segundos(datos.expiraEn) * 1000,
          intentos: 3,
          reenviarEn: 0,
        };
      return leerSesion(datos);
    },
    async solicitar(desafio: Desafio): Promise<Desafio> {
      const datos = objeto(
        await llamar('/otp/solicitar', {
          challengeToken: desafio.challengeToken,
          canal: desafio.canal,
        }),
      );
      let codigoPrueba: string | undefined;
      // Ruta independiente del contrato G7. Solo los servidores Vite de desarrollo la publican.
      if (buzonLocal) {
        try {
          const buzon = await fetch(buzonLocal, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeToken: desafio.challengeToken }),
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
          });
          if (buzon.ok) {
            const contenido = objeto(await buzon.json());
            if (typeof contenido.codigo === 'string' && /^\d{6}$/.test(contenido.codigo))
              codigoPrueba = contenido.codigo;
          }
        } catch {
          /* El OTP ya se solicitó; el usuario puede reintentar ver el buzón local. */
        }
      }
      return {
        ...desafio,
        codigoPrueba,
        destino: texto(datos.destinoEnmascarado),
        // El código no sobrevive a su desafío: se toma el vencimiento más cercano.
        codigoVenceEn: Math.min(
          desafio.venceEn,
          Date.now() + segundos(datos.expiraEn) * 1000,
          Date.now() + segundos(datos.desafioExpiraEn ?? datos.expiraEn) * 1000,
        ),
        intentos: 3,
        reenviarEn: 0,
      };
    },
    verificar: async (challengeToken: string, codigo: string) =>
      leerSesion(await llamar('/otp/verificar', { challengeToken, codigo })),
    renovar: async (refreshToken: string) => leerSesion(await llamar('/refresh', { refreshToken })),
    cerrar: async (refreshToken: string) => {
      await llamar('/logout', { refreshToken });
    },
    perfil: async (accessToken: string) => objeto(await llamar('/me', undefined, accessToken)),
  };
}
export type AccesoSeguridad = ReturnType<typeof crearAccesoSeguridad>;

/** Sesión independiente por app/pestaña; nunca persiste tokens, claves ni desafíos. */
export function crearGestorSesion(acceso: AccesoSeguridad, requiereGestor = false) {
  let estado: EstadoSesion = { sesion: null, desafio: null, motivo: null, aviso: null };
  const oyentes = new Set<() => void>();
  const tokensSesion = new Set<string>();
  let generacion = 0;
  let renovacion: Promise<string | null> | null = null;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  let activo = false;
  let cierre: Promise<void> | null = null;
  function publicar(cambios: Partial<EstadoSesion>) {
    estado = { ...estado, ...cambios };
    oyentes.forEach((oyente) => oyente());
    programar();
  }
  function programar() {
    clearTimeout(temporizador);
    if (!activo) return;
    if (estado.sesion) {
      // Renueva 60 s antes del vencimiento, esperando al menos 1 s.
      temporizador = setTimeout(
        () => {
          void renovar().catch(() => {});
        },
        Math.max(1000, estado.sesion.expiraEn - Date.now() - 60000),
      );
    } else if (estado.desafio) {
      temporizador = setTimeout(
        () => cancelarDesafio(mensajes.TOKEN_INVALIDO),
        Math.max(0, estado.desafio.venceEn - Date.now()),
      );
    }
  }
  function invalidar(rechazado?: string | null) {
    if (rechazado !== undefined && (!estado.sesion || estado.sesion.accessToken !== rechazado))
      return;
    if (!estado.sesion && estado.motivo === 'manual') return;
    generacion++;
    tokensSesion.clear();
    publicar({
      sesion: null,
      desafio: null,
      motivo: 'expirada',
      aviso: mensajes.REFRESCO_INVALIDO,
    });
  }
  function cancelarDesafio(aviso: string | null = null) {
    generacion++;
    publicar({ desafio: null, aviso });
  }
  async function aceptar(sesion: Sesion, version: number) {
    // La respuesta llegó tras un logout o un login nuevo: se cierra para no dejar una sesión viva.
    if (version !== generacion) {
      await acceso.cerrar(sesion.refreshToken).catch(() => {});
      return;
    }
    if (requiereGestor && !sesion.usuario.roles.includes('GESTOR_DESPACHO')) {
      await acceso.cerrar(sesion.refreshToken).catch(() => {});
      throw new ErrorSesion('SIN_PERMISO', mensajes.SIN_PERMISO, 403);
    }
    tokensSesion.add(sesion.accessToken);
    publicar({ sesion, desafio: null, motivo: null, aviso: null });
  }
  /** Comparte una renovación entre llamadas concurrentes: cada refresh token se consume una vez. */
  async function renovar(): Promise<string | null> {
    if (renovacion) return renovacion;
    const anterior = estado.sesion,
      version = generacion;
    if (!anterior) return null;
    const tarea = (async () => {
      try {
        const nueva = await acceso.renovar(anterior.refreshToken);
        if (nueva.usuario.id !== anterior.usuario.id) {
          await acceso.cerrar(nueva.refreshToken).catch(() => {});
          throw new ErrorSesion('REFRESCO_INVALIDO', mensajes.REFRESCO_INVALIDO, 401);
        }
        await aceptar(nueva, version);
        return version === generacion ? nueva.accessToken : null;
      } catch (error) {
        if (
          version === generacion &&
          (!(error instanceof ErrorSesion) ||
            error.estado === 401 ||
            error.estado === 403 ||
            error.codigo === 'RESPUESTA_INVALIDA')
        )
          invalidar();
        // Nunca repetir automáticamente un refresh de resultado incierto: pudo haberse consumido.
        else if (version === generacion) {
          generacion++;
          tokensSesion.clear();
          publicar({
            sesion: null,
            desafio: null,
            motivo: 'expirada',
            aviso: 'No pudimos confirmar la renovación. Inicia sesión de nuevo.',
          });
        }
        throw error;
      }
    })();
    renovacion = tarea;
    try {
      return await tarea;
    } finally {
      if (renovacion === tarea) renovacion = null;
    }
  }
  async function solicitar() {
    const desafio = estado.desafio,
      version = generacion;
    if (!desafio) return;
    try {
      const nuevo = await acceso.solicitar(desafio);
      if (version === generacion) publicar({ desafio: nuevo, aviso: null });
    } catch (error) {
      if (version !== generacion) return;
      if (error instanceof ErrorSesion && error.codigo === 'TOKEN_INVALIDO')
        cancelarDesafio(mensajes.TOKEN_INVALIDO);
      else if (error instanceof ErrorSesion && error.codigo === 'DEMASIADAS_SOLICITUDES') {
        publicar({ desafio: { ...desafio, reenviarEn: error.reintentarEn || Date.now() + 60000 } });
      }
      throw error;
    }
  }
  return {
    suscribir: (oyente: () => void) => {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
    leer: () => estado,
    activar: () => {
      activo = true;
      programar();
      return () => {
        activo = false;
        clearTimeout(temporizador);
      };
    },
    async iniciar(correo: string, contrasena: string) {
      const anterior = estado.sesion;
      const version = ++generacion;
      tokensSesion.clear();
      publicar({ sesion: null, desafio: null, aviso: null, motivo: null });
      if (anterior) void acceso.cerrar(anterior.refreshToken).catch(() => {});
      const resultado = await acceso.iniciar(correo, contrasena);
      if ('challengeToken' in resultado) {
        if (version !== generacion) return;
        publicar({ desafio: resultado });
        await solicitar();
      } else await aceptar(resultado, version);
    },
    solicitar,
    async verificar(codigo: string) {
      const desafio = estado.desafio,
        version = generacion;
      if (!desafio) throw new ErrorSesion('TOKEN_INVALIDO', mensajes.TOKEN_INVALIDO, 401);
      try {
        await aceptar(await acceso.verificar(desafio.challengeToken, codigo), version);
      } catch (error) {
        if (version !== generacion) return;
        if (error instanceof ErrorSesion) {
          if (error.codigo === 'TOKEN_INVALIDO') cancelarDesafio(mensajes.TOKEN_INVALIDO);
          else if (error.codigo === 'CODIGO_INVALIDO' || error.codigo === 'OTP_INTENTOS_AGOTADOS') {
            publicar({
              desafio: {
                ...desafio,
                intentos: error.intentosRestantes ?? Math.max(0, desafio.intentos - 1),
              },
            });
          } else if (error.codigo === 'OTP_EXPIRADO')
            publicar({ desafio: { ...desafio, codigoVenceEn: Date.now() } });
          else if (error.codigo === 'PASSWORD_CADUCADA')
            cancelarDesafio(mensajes.PASSWORD_CADUCADA);
        }
        throw error;
      }
    },
    cancelarDesafio,
    obtenerToken: () =>
      estado.sesion && estado.sesion.expiraEn > Date.now() ? estado.sesion.accessToken : null,
    async prepararToken() {
      if (estado.sesion && estado.sesion.expiraEn - Date.now() < 60000) return renovar();
      return estado.sesion?.accessToken ?? null;
    },
    async recuperarToken(rechazado: string | null) {
      const actual = estado.sesion;
      // Solo un token emitido en esta sesión puede disparar una renovación.
      if (!actual || !rechazado || !tokensSesion.has(rechazado)) return null;
      // Una respuesta tardía del JWT anterior comparte el resultado de la rotación ya terminada.
      if (actual.accessToken !== rechazado && actual.expiraEn > Date.now())
        return actual.accessToken;
      return renovar();
    },
    renovar,
    invalidar,
    cerrar() {
      if (cierre) return cierre;
      const anterior = estado.sesion,
        pendiente = renovacion;
      generacion++;
      tokensSesion.clear();
      const version = generacion;
      publicar({ sesion: null, desafio: null, motivo: 'manual', aviso: 'Cerraste sesión.' });
      const tarea = (async () => {
        // La renovación pendiente se encarga de revocar su resultado tardío en aceptar().
        if (pendiente) await pendiente.catch(() => {});
        if (anterior) {
          try {
            await acceso.cerrar(anterior.refreshToken);
          } catch {
            if (version === generacion)
              publicar({
                aviso:
                  'Cerraste la sesión en este equipo. No pudimos confirmar el cierre en Seguridad.',
              });
          }
        }
      })();
      cierre = tarea;
      void tarea.finally(() => {
        cierre = null;
      });
      return tarea;
    },
  };
}
export type GestorSesion = ReturnType<typeof crearGestorSesion>;
