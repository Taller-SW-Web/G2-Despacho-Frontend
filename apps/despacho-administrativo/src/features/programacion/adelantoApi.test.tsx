import { expect, it, vi } from 'vitest';
import { adelantarDespacho } from './api';
import type { ClienteApi } from '../../cliente/useClienteApi';

const comando = {
  idDespacho: 'despacho-1',
  version: 4,
  clave: '7c67fb9c-786d-4fc5-a2a6-f541a862e138',
  fechaAnterior: '2026-12-01',
  motivo: 'Disponibilidad',
};
const respuesta = {
  idDespacho: comando.idDespacho,
  estado: 'PENDIENTE_ASIGNACION',
  fechaProgramadaAnterior: comando.fechaAnterior,
  fechaProgramada: '2026-11-24',
  motivo: comando.motivo,
  versionDespacho: 5,
  actualizadoEn: '2026-11-25T02:00:00Z',
};
it('valida hoy en Lima al confirmar, aunque UTC sea el día siguiente', async () => {
  const post = vi.fn().mockResolvedValue({ data: respuesta });
  await expect(adelantarDespacho({ post } as unknown as ClienteApi, comando)).resolves.toEqual(
    respuesta,
  );
});
it.each([
  { estado: 'ASIGNADO' },
  { idDespacho: 'otro' },
  { fechaProgramadaAnterior: '2026-12-02' },
  { fechaProgramada: '2026-11-25' },
  { motivo: 'otro' },
  { versionDespacho: 4 },
  { actualizadoEn: 'fecha inválida' },
])('rechaza respuesta incoherente %j sin confirmar éxito', async (cambio) => {
  const post = vi.fn().mockResolvedValue({ data: { ...respuesta, ...cambio } });
  await expect(adelantarDespacho({ post } as unknown as ClienteApi, comando)).rejects.toThrow();
});
