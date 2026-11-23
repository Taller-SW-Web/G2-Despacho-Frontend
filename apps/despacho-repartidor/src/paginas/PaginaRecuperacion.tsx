import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { ErrorSesion } from '@despacho/cliente-api/sesion';
import { RECUPERACION_CONTRASENA_HABILITADA } from '../config';
import { useSesion } from '../sesion/SesionProveedor';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mensaje neutro: no revela si el correo pertenece a una cuenta (ES-F03-09 RN-02). */
export const MENSAJE_ENVIADO =
  'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también tu carpeta de correo no deseado.';

function mensajeError(fallo: unknown): string {
  if (fallo instanceof ErrorSesion) {
    if (fallo.codigo === 'DEMASIADAS_SOLICITUDES')
      return 'Hiciste varias solicitudes seguidas. Espera unos minutos antes de intentarlo de nuevo.';
    if (fallo.codigo === 'SIN_CONEXION') return fallo.message;
  }
  return 'No pudimos enviar la solicitud. Inténtalo nuevamente en unos minutos.';
}

/**
 * UI-02 de ES-F03-09. Seguridad envía el enlace y restablece la contraseña en su propia página;
 * esta pantalla solo pide el correo.
 */
export function PaginaRecuperacion({ habilitada = RECUPERACION_CONTRASENA_HABILITADA }) {
  const { sesion, solicitarRecuperacion } = useSesion();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const enCurso = useRef(false);

  if (!habilitada) return <Navigate to="/repartidor/acceso" replace />;
  if (sesion) return <Navigate to="/repartidor/ruta" replace />;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (enCurso.current) return;
    if (!CORREO.test(correo.trim())) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    enCurso.current = true;
    setOcupado(true);
    setError(null);
    try {
      await solicitarRecuperacion(correo);
      setEnviado(true);
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  }

  return (
    <Stack component="main" align="center" justify="center" mih="100dvh" p="md">
      <Paper component="form" onSubmit={enviar} withBorder p="xl" radius="lg" w="100%" maw={440}>
        <Stack gap="md">
          <Title order={1} size="h3">
            Recuperar contraseña
          </Title>
          {enviado ? (
            <Alert color="green" role="status">
              {MENSAJE_ENVIADO}
            </Alert>
          ) : (
            <>
              <Text size="sm">
                Escribe el correo de tu cuenta. Te enviaremos un enlace para crear una nueva
                contraseña.
              </Text>
              {error && (
                <Alert color="red" role="alert">
                  {error}
                </Alert>
              )}
              <TextInput
                label="Correo electrónico"
                autoComplete="username"
                autoCapitalize="none"
                inputMode="email"
                required
                value={correo}
                onChange={(evento) => setCorreo(evento.currentTarget.value)}
                disabled={ocupado}
                data-autofocus
              />
              <Button type="submit" fullWidth loading={ocupado}>
                Enviar enlace
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="subtle"
            disabled={ocupado}
            onClick={() => navegar('/repartidor/acceso')}
          >
            Volver al ingreso
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
