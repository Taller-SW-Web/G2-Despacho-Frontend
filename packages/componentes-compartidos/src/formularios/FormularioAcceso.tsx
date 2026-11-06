import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert, Button, Paper, PasswordInput, PinInput, Stack, Text, TextInput, Title } from '@mantine/core';

type DesafioVista = { venceEn: number; codigoVenceEn?: number; destino?: string; intentos: number; reenviarEn: number; codigoPrueba?: string };
export type FormularioAccesoProps = {
  titulo: string; subtitulo: string; local?: boolean; aviso?: string | null; desafio: DesafioVista | null;
  alIngresar: (correo: string, contrasena: string) => Promise<void>;
  alVerificar: (codigo: string) => Promise<void>;
  alReenviar: () => Promise<void>; alCancelar: () => void;
};

/** Vista controlada: el consumidor resuelve transporte, sesión y permisos. */
export function FormularioAcceso({ titulo, subtitulo, local, aviso, desafio, alIngresar, alVerificar, alReenviar, alCancelar }: FormularioAccesoProps) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const enCurso = useRef(false);
  const entradaOtp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!desafio) { setCodigo(''); setError(null); return; }
    setAhora(Date.now());
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    entradaOtp.current?.focus();
    return () => clearInterval(reloj);
  }, [desafio?.venceEn, desafio?.codigoVenceEn]);
  useEffect(() => { if (!ocupado && desafio) entradaOtp.current?.focus(); }, [ocupado, desafio?.intentos]);
  const restante = desafio ? Math.max(0, Math.ceil((Math.min(desafio.codigoVenceEn ?? 0, desafio.venceEn) - ahora) / 1000)) : 0;
  const agotado = Boolean(desafio && (desafio.intentos <= 0 || restante === 0));
  async function ejecutar(accion: () => Promise<void>) {
    if (enCurso.current) return;
    enCurso.current = true; setOcupado(true); setError(null);
    try { await accion(); }
    catch (fallo) { setError(fallo instanceof Error ? fallo.message : 'No se pudo completar el acceso.'); setCodigo(''); entradaOtp.current?.focus(); }
    finally { enCurso.current = false; setOcupado(false); }
  }
  async function ingresar(evento: FormEvent) {
    evento.preventDefault();
    if (desafio) { await verificar(codigo); return; }
    if (!correo.trim() || !contrasena) { setError('Ingresa tu correo y contraseña.'); return; }
    const clave = contrasena;
    await ejecutar(async () => { try { await alIngresar(correo, clave); } finally { setContrasena(''); } });
  }
  async function verificar(valor: string) {
    if (!/^\d{6}$/.test(valor)) { setError('Escribe los seis dígitos del código.'); return; }
    if (agotado || ocupado) return;
    await ejecutar(() => alVerificar(valor));
  }
  return <Stack component="main" align="center" justify="center" mih="100dvh" p="md">
    <Stack gap={4} ta="center"><Title order={1}>{titulo}</Title><Text c="dimmed">{subtitulo}</Text></Stack>
    <Paper component="form" onSubmit={ingresar} withBorder p="xl" radius="lg" w="100%" maw={440}>
      <Stack gap="md">
        {local && <Alert color="blue" title="Prueba local" role="note">Estas cuentas pertenecen al entorno local. No se envían correos reales.</Alert>}
        {aviso && <Alert color="yellow" role="status">{aviso}</Alert>}
        {error && <Alert color="red" role="alert">{error}</Alert>}
        {desafio ? <>
          <Title order={2} size="h3">Verifica tu acceso</Title>
          <Text size="sm">{desafio.destino ? `Escribe el código enviado a ${desafio.destino}.` : 'Solicita un código para continuar.'}</Text>
          {local && desafio.codigoPrueba && <Text size="sm">Código del buzón local: <strong>{desafio.codigoPrueba}</strong></Text>}
          <PinInput ref={entradaOtp} length={6} type="number" oneTimeCode value={codigo} onChange={setCodigo}
            onComplete={valor => { void verificar(valor); }} disabled={ocupado || agotado} aria-label="Código de verificación" />
          <Text size="sm" role="status">{restante > 0 ? `Vence en ${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}.` : 'Solicita un código nuevo.'} Te quedan {desafio.intentos} intentos.</Text>
          <Button type="submit" loading={ocupado} disabled={agotado || codigo.length !== 6}>Verificar</Button>
          <Button type="button" variant="light" loading={ocupado} disabled={desafio.reenviarEn > ahora}
            onClick={() => { setCodigo(''); void ejecutar(alReenviar); }}>Enviar otro código</Button>
          <Button type="button" variant="subtle" disabled={ocupado} onClick={() => { setError(null); alCancelar(); }}>Volver al ingreso</Button>
        </> : <>
          <TextInput label="Correo electrónico" aria-label="Correo electrónico" autoComplete="username" autoCapitalize="none" inputMode="email" required
            value={correo} onChange={evento => setCorreo(evento.currentTarget.value)} disabled={ocupado} />
          <PasswordInput label="Contraseña" aria-label="Contraseña" autoComplete="current-password" required value={contrasena}
            onChange={evento => setContrasena(evento.currentTarget.value)} disabled={ocupado}
            visibilityToggleButtonProps={{ 'aria-label': 'Mostrar u ocultar contraseña' }} />
          <Button type="submit" fullWidth loading={ocupado}>Ingresar</Button>
          {local && <Text size="xs" c="dimmed">Gestor: gestor@despacho.pe. Repartidores: gerardo@despacho.pe y kevin@despacho.pe. Clave local: Ruta2026!</Text>}
        </>}
      </Stack>
    </Paper>
  </Stack>;
}
