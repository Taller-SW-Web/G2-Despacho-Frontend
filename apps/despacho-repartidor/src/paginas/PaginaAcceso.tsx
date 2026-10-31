import { useState, type FormEvent } from 'react';
import { Alert, Box, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconAlertCircle, IconLock, IconUser } from '@tabler/icons-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MODO_DEMO } from '../config';
import { mensajeError } from '../api/errores';
import { CLAVE_DEMO } from '../api/operacionDemo';
import { useSesion } from '../sesion/SesionProveedor';
import { MarcaDespacho } from '../componentes/MarcaDespacho';
import clases from './PaginaAcceso.module.css';

/** 01 · Acceso. Las credenciales se validan en Seguridad; el perfil de campo lo comprueba Operación al cargar la ruta. */
export function PaginaAcceso() {
  const { sesion, iniciar, motivoCierre } = useSesion();
  const navigate = useNavigate();
  const destino = (useLocation().state as { desde?: string } | null)?.desde ?? '/repartidor/ruta';
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sesion) return <Navigate to={destino} replace />;

  async function ingresar(evento: FormEvent) {
    evento.preventDefault();
    if (!usuario.trim() || !clave) { setError('Ingresa tu usuario y contraseña.'); return; }
    setEnviando(true);
    setError(null);
    try {
      await iniciar(usuario, clave);
      navigate(destino, { replace: true });
    } catch (fallo) {
      setError(mensajeError(fallo));
      setEnviando(false);
    }
  }

  return (
    <Box component="main" className={clases.raiz}>
      <Stack align="center" gap={4} className={clases.marca}>
        <MarcaDespacho />
        <Title order={1} className={clases.titulo}>Despacho</Title>
        <Text c="var(--ia-color-text-disabled)">Aplicación del repartidor</Text>
      </Stack>
      <Paper component="form" onSubmit={ingresar} p="md" radius="lg" className={clases.formulario} noValidate>
        <Stack gap="md">
          {motivoCierre === 'expirada' && !error && (
            <Alert color="yellow" icon={<IconAlertCircle size={18} />} title="Sesión expirada">Vuelve a ingresar para continuar.</Alert>
          )}
          {error && <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">{error}</Alert>}
          <TextInput label="Usuario o correo" leftSection={<IconUser size={20} aria-hidden="true" />} autoComplete="username"
            autoCapitalize="none" inputMode="email" value={usuario} onChange={(e) => setUsuario(e.currentTarget.value)} disabled={enviando} />
          <PasswordInput label="Contraseña" leftSection={<IconLock size={20} aria-hidden="true" />} autoComplete="current-password"
            value={clave} onChange={(e) => setClave(e.currentTarget.value)} disabled={enviando}
            visibilityToggleButtonProps={{ 'aria-label': 'Mostrar u ocultar contraseña' }} />
          <Button type="submit" fullWidth size="lg" loading={enviando}>Ingresar</Button>
          {MODO_DEMO && <Text size="sm" c="dimmed" ta="center">Demostración: cualquier usuario con la clave {CLAVE_DEMO}</Text>}
        </Stack>
      </Paper>
      <Text size="sm" ta="center" c="var(--ia-color-text-disabled)" className={clases.ayuda}>
        ¿No puedes ingresar? Comunícate con el Gestor de Despacho.
      </Text>
    </Box>
  );
}
