import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { PaginaProgramacion } from './PaginaProgramacion';
import { paginaPrueba, zonasPrueba } from './fixtures.prueba';
import {
  rutaPrueba,
  monitoreoRutasPrueba,
  candidatosRutaPrueba,
  reasignacionPrueba,
} from './rutas.fixtures.prueba';
import { consultarRuta, guardarSecuencia, reasignarDespacho } from './rutasApi';
import { prepararSecuencia } from './rutasModelo';

const { obtener, publicar, modificar, notificar } = vi.hoisted(() => ({
  obtener: vi.fn(),
  publicar: vi.fn(),
  modificar: vi.fn(),
  notificar: vi.fn(),
}));
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: obtener, post: publicar, put: modificar };
  return { useClienteApi: () => cliente };
});
vi.mock('@despacho/componentes-compartidos', async (original) => ({
  ...(await original<typeof import('@despacho/componentes-compartidos')>()),
  notificarOperacion: notificar,
}));
let ruta: typeof rutaPrueba;
const desplazamientoOriginal = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView',
);
beforeAll(() => {
  // JSDOM no implementa desplazamiento; el layout/scroll real se comprueba con Chromium.
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});
afterAll(() => {
  if (desplazamientoOriginal)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', desplazamientoOriginal);
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});
function fallo(status: number, code = '') {
  return { isAxiosError: true, response: { status, data: { status, code } } };
}
beforeEach(() => {
  vi.clearAllMocks();
  ruta = structuredClone(rutaPrueba);
  obtener.mockImplementation(async (path: string) => ({
    data: structuredClone(
      path.endsWith('/ruta')
        ? ruta
        : path.endsWith('/monitoreo')
          ? monitoreoRutasPrueba
          : path.endsWith('/disponibles')
            ? candidatosRutaPrueba
            : path.endsWith('/zonas')
              ? zonasPrueba
              : paginaPrueba,
    ),
  }));
  modificar.mockImplementation(async (_path, cuerpo) => {
    ruta.despachos = cuerpo.despachos.map((p: { idDespacho: string; posicion: number }) => ({
      ...ruta.despachos.find((d) => d.idDespacho === p.idDespacho)!,
      posicion: p.posicion,
    }));
    ruta.versionRuta = `"${'b'.repeat(64)}"`;
    return { data: structuredClone(ruta) };
  });
  publicar.mockResolvedValue({ data: reasignacionPrueba });
});
function montar() {
  return render(
    <MantineProvider theme={tema}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PaginaProgramacion />
      </MemoryRouter>
    </MantineProvider>,
  );
}
async function abrirRuta(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('tab', { name: 'Rutas por repartidor' }));
  const selector = screen.getByRole('combobox', { name: 'Jornada / repartidor' });
  await waitFor(() => expect(selector).toBeEnabled());
  selector.focus();
  await usuario.keyboard('{ArrowDown}{Enter}');
  await screen.findByText('TRK-RUTA-1 · Pedido PED-RUTA-1');
}
async function abrirReasignacion(usuario: ReturnType<typeof userEvent.setup>) {
  await abrirRuta(usuario);
  await usuario.click(screen.getByRole('button', { name: 'Reasignar DSP-RUTA-1' }));
  await screen.findByRole('radio', { name: 'Ana de otra zona' });
}
it('habilita la pestaña y consulta la ruta real por las rutas públicas, con estados fijos', async () => {
  const usuario = userEvent.setup();
  montar();
  await abrirRuta(usuario);
  expect(obtener).toHaveBeenCalledWith(
    `/api/v1/jornadas/${ruta.idJornada}/ruta`,
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(screen.getByText('Posición histórica fija; solo lectura.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Subir DSP-RUTA-2' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reasignar DSP-RUTA-2' })).not.toBeInTheDocument();
});
it('reordena con teclado, descarta sin enviar y guarda una sola vez con versión de ruta y UUID', async () => {
  const usuario = userEvent.setup();
  montar();
  await abrirRuta(usuario);
  const bajar = screen.getByRole('button', { name: 'Bajar DSP-RUTA-1' });
  bajar.focus();
  await usuario.keyboard('{Enter}');
  expect(screen.getByText('Hay 2 paradas modificadas sin guardar.')).toBeVisible();
  expect(screen.getByRole('tab', { name: /Cola de pendientes/ })).toBeDisabled();
  await usuario.click(screen.getByRole('button', { name: 'Descartar cambios' }));
  expect(modificar).not.toHaveBeenCalled();
  await usuario.click(screen.getByRole('button', { name: 'Bajar DSP-RUTA-1' }));
  await usuario.dblClick(screen.getByRole('button', { name: 'Guardar orden' }));
  await waitFor(() =>
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: 'Secuencia de ruta actualizada.' }),
    ),
  );
  expect(modificar).toHaveBeenCalledTimes(1);
  const [path, cuerpo, config] = modificar.mock.calls[0];
  expect(path).toBe(`/api/v1/jornadas/${rutaPrueba.idJornada}/secuencia`);
  expect(cuerpo.despachos.map((p: { idDespacho: string }) => p.idDespacho)).toEqual([
    rutaPrueba.despachos[2].idDespacho,
    rutaPrueba.despachos[1].idDespacho,
    rutaPrueba.despachos[0].idDespacho,
  ]);
  expect(config.headers['If-Match']).toBe(rutaPrueba.versionRuta);
  expect(config.headers['Idempotency-Key']).toMatch(/^[a-f0-9-]{36}$/);
});
it('el arrastre solo intercambia paradas asignadas', async () => {
  const usuario = userEvent.setup();
  montar();
  await abrirRuta(usuario);
  const datos = new Map<string, string>();
  const dataTransfer = {
    setData: (tipo: string, valor: string) => datos.set(tipo, valor),
    getData: (tipo: string) => datos.get(tipo) ?? '',
  };
  fireEvent.dragStart(screen.getByRole('button', { name: 'Arrastrar DSP-RUTA-1' }), {
    dataTransfer,
  });
  fireEvent.drop(screen.getByRole('button', { name: 'Bajar DSP-RUTA-3' }).closest('li')!, {
    dataTransfer,
  });
  expect(screen.getByText('Hay 2 paradas modificadas sin guardar.')).toBeVisible();
});
it('al volver al orden original deja de editar y acepta una ruta renovada con otra parada', async () => {
  const usuario = userEvent.setup();
  montar();
  await abrirRuta(usuario);
  await usuario.click(screen.getByRole('button', { name: 'Bajar DSP-RUTA-1' }));
  await usuario.click(screen.getByRole('button', { name: 'Subir DSP-RUTA-1' }));
  expect(screen.queryByRole('button', { name: 'Guardar orden' })).not.toBeInTheDocument();
  ruta.despachos.push({
    ...ruta.despachos[0],
    idDespacho: '10000000-0000-4000-8000-000000000004',
    posicion: 4,
    codigoOperativo: 'DSP-RUTA-4',
    codigoRastreoInterno: 'TRK-RUTA-4',
  });
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(await screen.findByRole('button', { name: 'Reasignar DSP-RUTA-4' })).toBeVisible();
  expect(modificar).not.toHaveBeenCalled();
});
it.each(['huecos', 'cerrada', 'en-proceso'])(
  'consulta sin renumerar ni habilitar reordenamiento ante %s',
  async (caso) => {
    if (caso === 'huecos') ruta.despachos[2].posicion = 7;
    if (caso === 'cerrada') ruta.estadoJornada = 'CERRADA';
    if (caso === 'en-proceso') ruta.despachos[0].cancelacionEnProceso = true;
    const usuario = userEvent.setup();
    montar();
    await abrirRuta(usuario);
    expect(screen.getByRole('button', { name: 'Bajar DSP-RUTA-1' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar orden' })).not.toBeInTheDocument();
    expect(modificar).not.toHaveBeenCalled();
    if (caso === 'huecos') expect(screen.getByText(/#7 · DSP-RUTA-3/)).toBeVisible();
  },
);
it('un 409 impide reutilizar la fotografía y exige descartar y consultar', async () => {
  modificar.mockRejectedValue(fallo(409));
  const usuario = userEvent.setup();
  montar();
  await abrirRuta(usuario);
  await usuario.click(screen.getByRole('button', { name: 'Bajar DSP-RUTA-1' }));
  await usuario.click(screen.getByRole('button', { name: 'Guardar orden' }));
  await screen.findByText('No se pudo confirmar el orden');
  expect(screen.getByRole('button', { name: 'Guardar orden' })).toBeDisabled();
  await usuario.click(screen.getByRole('button', { name: 'Descartar y consultar estado actual' }));
  await screen.findByRole('button', { name: 'Bajar DSP-RUTA-1' });
  expect(modificar).toHaveBeenCalledTimes(1);
});
it('recupera un guardado incierto con la misma clave, versión y contenido sin reenvío automático', async () => {
  modificar.mockRejectedValueOnce(new Error('Respuesta perdida'));
  const usuario = userEvent.setup();
  montar();
  await abrirRuta(usuario);
  await usuario.click(screen.getByRole('button', { name: 'Bajar DSP-RUTA-1' }));
  await usuario.click(screen.getByRole('button', { name: 'Guardar orden' }));
  await screen.findByRole('button', { name: 'Recuperar mismo guardado' });
  expect(modificar).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Descartar cambios' })).toBeDisabled();
  await usuario.click(screen.getByRole('button', { name: 'Recuperar mismo guardado' }));
  await waitFor(() => expect(modificar).toHaveBeenCalledTimes(2));
  expect(modificar.mock.calls[1]).toEqual(modificar.mock.calls[0]);
  await waitFor(() =>
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'exito' })),
  );
});
it('excluye al chofer actual, bloquea sobrecarga y exige motivo antes de reasignar', async () => {
  const usuario = userEvent.setup();
  montar();
  await abrirReasignacion(usuario);
  expect(screen.queryByRole('radio', { name: 'Conductor actual' })).not.toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Pedro sin peso' })).toBeDisabled();
  await usuario.click(screen.getByRole('radio', { name: 'Ana de otra zona' }));
  expect(screen.getByRole('button', { name: 'Confirmar reasignación' })).toBeDisabled();
  await usuario.type(
    screen.getByRole('textbox', { name: 'Motivo de la reasignación' }),
    'Redistribución',
  );
  publicar.mockImplementation(async () => {
    ruta.despachos = ruta.despachos.slice(1);
    return { data: reasignacionPrueba };
  });
  await usuario.dblClick(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(publicar).toHaveBeenCalledTimes(1);
  expect(publicar).toHaveBeenCalledWith(
    `/api/v1/despachos/${rutaPrueba.despachos[0].idDespacho}/reasignacion`,
    { idNuevoRepartidor: 'rep-otra-zona', idNuevaJornada: 'jor-2', motivo: 'Redistribución' },
    { headers: { 'If-Match': '"4"', 'Idempotency-Key': expect.stringMatching(/^[a-f0-9-]{36}$/) } },
  );
  await waitFor(() =>
    expect(screen.queryByText('TRK-RUTA-1 · Pedido PED-RUTA-1')).not.toBeInTheDocument(),
  );
});
it.each([503, 409])(
  'recupera reasignación pendiente (%s) sin cambiar motivo, versión ni clave',
  async (status) => {
    publicar.mockRejectedValueOnce(
      fallo(status, status === 409 ? 'DESP_ERROR_REASIGNACION_EN_PROCESO' : ''),
    );
    const usuario = userEvent.setup();
    montar();
    await abrirReasignacion(usuario);
    await usuario.click(screen.getByRole('radio', { name: 'Ana de otra zona' }));
    await usuario.type(
      screen.getByRole('textbox', { name: 'Motivo de la reasignación' }),
      'Redistribución',
    );
    await usuario.click(screen.getByRole('button', { name: 'Confirmar reasignación' }));
    await screen.findByRole('button', { name: 'Recuperar misma reasignación' });
    expect(screen.getByRole('textbox', { name: 'Motivo de la reasignación' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Cerrar y actualizar rutas' }),
    ).not.toBeInTheDocument();
    expect(publicar).toHaveBeenCalledTimes(1);
    await usuario.click(screen.getByRole('button', { name: 'Recuperar misma reasignación' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(publicar.mock.calls[1]).toEqual(publicar.mock.calls[0]);
  },
);
it('un rechazo de capacidad renueva candidatos y exige otra selección sin reenviar el POST', async () => {
  publicar.mockRejectedValue(fallo(422));
  const usuario = userEvent.setup();
  montar();
  await abrirReasignacion(usuario);
  await usuario.click(screen.getByRole('radio', { name: 'Ana de otra zona' }));
  await usuario.type(
    screen.getByRole('textbox', { name: 'Motivo de la reasignación' }),
    'Redistribución',
  );
  await usuario.click(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  await screen.findByText('No se pudo confirmar la reasignación');
  await waitFor(() =>
    expect(screen.getByRole('radio', { name: 'Ana de otra zona' })).not.toBeChecked(),
  );
  expect(screen.getByRole('button', { name: 'Confirmar reasignación' })).toBeDisabled();
  expect(
    obtener.mock.calls.filter(([path]) => path.endsWith('/disponibles')).length,
  ).toBeGreaterThanOrEqual(2);
  expect(publicar).toHaveBeenCalledTimes(1);
});
it('retira rutas y modal al perder autorización y no aplica respuestas de otra sesión', async () => {
  const usuario = userEvent.setup();
  montar();
  await abrirReasignacion(usuario);
  publicar.mockRejectedValue(fallo(403));
  await usuario.click(screen.getByRole('radio', { name: 'Ana de otra zona' }));
  await usuario.type(
    screen.getByRole('textbox', { name: 'Motivo de la reasignación' }),
    'Redistribución',
  );
  await usuario.click(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.queryByText('TRK-RUTA-1 · Pedido PED-RUTA-1')).not.toBeInTheDocument();
  expect(notificar).not.toHaveBeenCalled();
});
it('ignora una mutación completada después de cambiar la sesión', async () => {
  let resolver!: (valor: unknown) => void;
  publicar.mockImplementation(
    () =>
      new Promise((r) => {
        resolver = r;
      }),
  );
  const usuario = userEvent.setup();
  montar();
  await abrirReasignacion(usuario);
  await usuario.click(screen.getByRole('radio', { name: 'Ana de otra zona' }));
  await usuario.type(
    screen.getByRole('textbox', { name: 'Motivo de la reasignación' }),
    'Redistribución',
  );
  await usuario.click(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  await act(async () => window.dispatchEvent(new Event('despacho:sesion')));
  await act(async () => resolver({ data: reasignacionPrueba }));
  expect(notificar).not.toHaveBeenCalled();
});
it('el adaptador rechaza respuestas de otra ruta, secuencia o identidad de reasignación', async () => {
  // Doble del transporte: no acredita servicios. Nunca aceptar como éxito un cuerpo ajeno.
  const cliente = { get: obtener, put: modificar, post: publicar } as unknown as Parameters<
    typeof consultarRuta
  >[0];
  await expect(
    consultarRuta(cliente, 'otra-jornada', new AbortController().signal),
  ).rejects.toThrow();
  const orden = rutaPrueba.despachos.map((p) => p.idDespacho).reverse();
  const comando = prepararSecuencia(rutaPrueba, orden);
  modificar.mockResolvedValue({ data: rutaPrueba });
  await expect(guardarSecuencia(cliente, comando)).rejects.toThrow();
  publicar.mockResolvedValue({ data: { ...reasignacionPrueba, idRepartidor: 'otro-destino' } });
  await expect(
    reasignarDespacho(cliente, {
      idDespacho: rutaPrueba.despachos[0].idDespacho,
      idRepartidorOrigen: rutaPrueba.despachos[0].idRepartidor,
      idJornadaOrigen: rutaPrueba.idJornada,
      version: 4,
      clave: crypto.randomUUID(),
      cuerpo: {
        idNuevoRepartidor: 'rep-otra-zona',
        idNuevaJornada: 'jor-2',
        motivo: 'Redistribución',
      },
    }),
  ).rejects.toThrow();
});
