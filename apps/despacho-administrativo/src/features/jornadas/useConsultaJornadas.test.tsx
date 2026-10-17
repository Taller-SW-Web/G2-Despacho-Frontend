import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useConsultaJornadas } from './useConsultaJornadas';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it('descarta la respuesta anterior aunque el transporte ignore la cancelación', async () => {
  let resolver!: (valor: string) => void;
  const anterior = () => new Promise<string>((terminar) => { resolver = terminar; });
  const siguiente = async () => 'resultado actual';
  const vista = renderHook(({ cargar }) => useConsultaJornadas(cargar), { initialProps: { cargar: anterior } });
  vista.rerender({ cargar: siguiente });
  await waitFor(() => expect(vista.result.current.datos).toBe('resultado actual'));
  await act(async () => resolver('resultado anterior'));
  expect(vista.result.current.datos).toBe('resultado actual');
});
it('solo actualiza periódicamente con la página visible y recupera al volver', async () => {
  vi.useFakeTimers();
  const visibilidad = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const cargar = vi.fn().mockResolvedValue('confirmado');
  const vista = renderHook(() => useConsultaJornadas(cargar, true, 30000));
  await act(async () => {});
  expect(cargar).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(cargar).toHaveBeenCalledTimes(2);
  visibilidad.mockReturnValue('hidden');
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(cargar).toHaveBeenCalledTimes(2);
  visibilidad.mockReturnValue('visible');
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(cargar).toHaveBeenCalledTimes(3); vista.unmount();
});
