import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SesionProveedor, useSesion } from './SesionProveedor';
import { useClienteApi } from '../cliente/useClienteApi';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

it('un build publicado ignora tanto el modo demo como los tokens antiguos del navegador', async () => {
  vi.stubEnv('DEV', false);
  vi.stubEnv('VITE_DEMO_SIN_AUTENTICACION', 'true');
  localStorage.setItem('despacho.token', 'token-antiguo');
  const { result } = renderHook(() => ({ sesion: useSesion(), cliente: useClienteApi() }), {
    wrapper: SesionProveedor,
  });
  expect(result.current.sesion.modoDemo).toBe(false);
  expect(result.current.sesion.obtenerToken()).toBeNull();
  let autorizacion: unknown;
  result.current.cliente.defaults.adapter = async (configuracion) => {
    autorizacion = configuracion.headers.Authorization;
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config: configuracion };
  };
  await result.current.cliente.get('/api/v1/zonas');
  expect(autorizacion).toBeUndefined();
  act(() => result.current.sesion.guardarToken(null));
  expect(localStorage.getItem('despacho.token')).toBeNull();
});

it('un token guardado antes de recargar no restaura una sesión publicada', () => {
  vi.stubEnv('DEV', false);
  vi.stubEnv('VITE_DEMO_SIN_AUTENTICACION', 'false');
  localStorage.setItem('despacho.token', 'token-real-de-prueba');
  const { result } = renderHook(useSesion, { wrapper: SesionProveedor });
  expect(result.current.modoDemo).toBe(false);
  expect(result.current.obtenerToken()).toBeNull();
});

it('al cerrar sesión no recupera el token de desarrollo; admite una nueva sesión explícita', () => {
  vi.stubEnv('DEV', true);
  vi.stubEnv('VITE_DEV_TOKEN', 'token-simulado');
  const { result } = renderHook(useSesion, { wrapper: SesionProveedor });
  expect(result.current.obtenerToken()).toBe('token-simulado');
  act(() => result.current.guardarToken(null));
  expect(result.current.obtenerToken()).toBeNull();
  act(() => result.current.guardarToken('nuevo-token-simulado'));
  expect(result.current.obtenerToken()).toBe('nuevo-token-simulado');
});
