import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SesionProveedor, useSesion } from './SesionProveedor';

afterEach(() => { localStorage.clear(); vi.unstubAllEnvs(); });

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
