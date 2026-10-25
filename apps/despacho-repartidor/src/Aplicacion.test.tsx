import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { Aplicacion } from './Aplicacion';
import { ErrorOperacion } from './api/errores';
import { crearOperacionDemo } from './api/operacionDemo';
import type { PuertoOperacion } from './api/tipos';
import { SesionProveedor } from './sesion/SesionProveedor';

vi.mock('./evidencia/optimizarFoto', () => ({ optimizarFoto: async (archivo: File) => archivo }));
vi.mock('./sesion/servicioAcceso', () => ({
  iniciarSesionSeguridad: vi.fn(async (_origen: string, usuario: string, clave: string) => {
    if (clave !== 'correcta') throw new ErrorOperacion('validacion', 'Usuario o contraseña incorrectos.');
    return { token: 'jwt', expiraEn: Date.now() + 900_000, usuario };
  }),
}));

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ASIGNADO = '00000000-0000-4000-8000-000000000002';
const foto = () => new File([new Uint8Array(600_000)], 'foto.jpg', { type: 'image/jpeg' });

function espiar(puerto: PuertoOperacion): PuertoOperacion {
  for (const nombre of Object.keys(puerto) as (keyof PuertoOperacion)[]) vi.spyOn(puerto, nombre);
  return puerto;
}

function montar(ruta: string, puerto: PuertoOperacion) {
  return render(
    <MantineProvider theme={tema}>
      <Notifications />
      <MemoryRouter initialEntries={[ruta]}>
        <SesionProveedor><Aplicacion puerto={puerto} /></SesionProveedor>
      </MemoryRouter>
    </MantineProvider>,
  );
}

function iniciarSesionGuardada() {
  localStorage.setItem('despacho.token', 'jwt');
  localStorage.setItem('despacho.repartidor.expiraEn', String(Date.now() + 900_000));
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  // JSDOM no implementa URLs de objetos; la previsualización solo necesita una cadena.
  URL.createObjectURL = vi.fn(() => 'blob:prueba');
  URL.revokeObjectURL = vi.fn();
  // El Textarea con autosize escucha la carga de fuentes, que JSDOM tampoco implementa.
  Object.defineProperty(document, 'fonts', { configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn(), ready: Promise.resolve() } });
});
afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('acceso', () => {
  it('sin sesión lleva al ingreso y, con credenciales válidas, abre la ruta', async () => {
    const usuario = userEvent.setup();
    montar('/repartidor/ruta', espiar(crearOperacionDemo()));
    await usuario.type(await screen.findByLabelText('Usuario o correo'), 'mrojas@despacho.pe');
    await usuario.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.');
    await usuario.clear(screen.getByLabelText('Contraseña'));
    await usuario.type(screen.getByLabelText('Contraseña'), 'correcta');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('heading', { name: 'Mi ruta' })).toBeInTheDocument();
  });

  it('un 401 de Operación cierra la sesión y avisa que expiró', async () => {
    iniciarSesionGuardada();
    const puerto = espiar(crearOperacionDemo());
    vi.mocked(puerto.consultarRuta).mockRejectedValue(new ErrorOperacion('sesion', 'Tu sesión expiró.'));
    montar('/repartidor/ruta', puerto);
    expect(await screen.findByText('Sesión expirada')).toBeInTheDocument();
    expect(localStorage.getItem('despacho.token')).toBeNull();
  });
});

describe('mi ruta', () => {
  it('muestra el progreso, marca el siguiente y no muestra datos personales de un despacho resuelto', async () => {
    iniciarSesionGuardada();
    montar('/repartidor/ruta', espiar(crearOperacionDemo()));
    expect(await screen.findByText('1 de 4 despachos resueltos')).toBeInTheDocument();
    const tarjetas = screen.getAllByRole('button', { name: /Abrir despacho/ });
    expect(tarjetas).toHaveLength(4);
    expect(within(tarjetas[0]).queryByText(/Arequipa/)).not.toBeInTheDocument();
    expect(within(tarjetas[0]).getByText(/Entregado a las \d{2}:\d{2}/)).toBeInTheDocument();
    expect(within(tarjetas[1]).getByText('Siguiente')).toBeInTheDocument();
    expect(within(tarjetas[1]).getByText('Jr. Pumacahua 1180, Jesús María')).toBeInTheDocument();
    expect(within(tarjetas[3]).getByText('Intento 2 de 2')).toBeInTheDocument();
  });
});

describe('detalle e inicio de traslado', () => {
  it('muestra la hora de asignación e inicia el traslado con una clave UUID v4', async () => {
    iniciarSesionGuardada();
    const usuario = userEvent.setup();
    const puerto = espiar(crearOperacionDemo());
    montar(`/repartidor/despachos/${ASIGNADO}`, puerto);
    expect(await screen.findByText('Asignado a las')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Llamar/ })).toHaveAttribute('href', 'tel:+51987654321');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar traslado' }));
    expect(await screen.findByText('En camino desde')).toBeInTheDocument();
    expect(vi.mocked(puerto.iniciarTraslado).mock.calls[0][1]).toMatch(UUID_V4);
    expect(screen.getByRole('button', { name: 'Confirmar entrega' })).toBeInTheDocument();
  });

  it('sin señal informa que no se registró y el reintento usa la misma clave', async () => {
    iniciarSesionGuardada();
    const usuario = userEvent.setup();
    const puerto = espiar(crearOperacionDemo());
    vi.mocked(puerto.iniciarTraslado).mockRejectedValueOnce(new ErrorOperacion('sinConexion', 'Sin conexión. El cambio no se registró.'));
    montar(`/repartidor/despachos/${ASIGNADO}`, puerto);
    await usuario.click(await screen.findByRole('button', { name: 'Iniciar traslado' }));
    expect(await screen.findByText('No se registró el cambio')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Iniciar traslado' }));
    await screen.findByText('En camino desde');
    const [primera, segunda] = vi.mocked(puerto.iniciarTraslado).mock.calls;
    expect(segunda[1]).toBe(primera[1]);
  });
});

describe('entrega y fallo', () => {
  async function enCamino(puerto: PuertoOperacion) { await puerto.iniciarTraslado(ASIGNADO, 'clave'); }

  it('la entrega exige foto, la sube una vez y vuelve a la ruta', async () => {
    iniciarSesionGuardada();
    const usuario = userEvent.setup();
    const puerto = espiar(crearOperacionDemo());
    await enCamino(puerto);
    montar(`/repartidor/despachos/${ASIGNADO}/entrega`, puerto);
    const confirmar = await screen.findByRole('button', { name: 'Confirmar entrega' });
    expect(confirmar).toBeDisabled();
    await usuario.upload(document.querySelector('input[type="file"]') as HTMLInputElement, foto());
    expect(await screen.findByText(/Foto optimizada · 586 KB · sin datos de ubicación/)).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Nombre de quien recibe (opcional)'), 'Carlos Quispe');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    expect(await screen.findByRole('heading', { name: 'Mi ruta' })).toBeInTheDocument();
    expect(puerto.subirEvidencia).toHaveBeenCalledTimes(1);
    expect(vi.mocked(puerto.registrarEntrega).mock.calls[0][2]).toMatchObject({ recibidoPor: 'Carlos Quispe' });
  });

  it('el fallo ofrece solo motivos de campo, exige motivo y muestra el resultado', async () => {
    iniciarSesionGuardada();
    const usuario = userEvent.setup();
    const puerto = espiar(crearOperacionDemo());
    vi.mocked(puerto.consultarMotivos).mockResolvedValue([
      { codigo: 'CLIENTE_AUSENTE', etiqueta: 'Cliente ausente', seleccionableEnCampo: true, consumeIntento: true, activo: true },
      { codigo: 'NO_INTENTADO', etiqueta: 'No intentado por fin de jornada', seleccionableEnCampo: false, consumeIntento: false, activo: true },
      { codigo: 'ANTIGUO', etiqueta: 'Motivo retirado', seleccionableEnCampo: true, consumeIntento: true, activo: false },
    ]);
    await enCamino(puerto);
    montar(`/repartidor/despachos/${ASIGNADO}/fallo`, puerto);
    expect(await screen.findByText('Cliente ausente')).toBeInTheDocument();
    expect(screen.queryByText('No intentado por fin de jornada')).not.toBeInTheDocument();
    expect(screen.queryByText('Motivo retirado')).not.toBeInTheDocument();
    expect(screen.getByText('Este intento contará como Intento 1 de 2.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Registrar fallo' }));
    expect(screen.getByText('Selecciona el motivo.')).toBeInTheDocument();
    expect(puerto.registrarFallo).not.toHaveBeenCalled();
    await usuario.click(screen.getByText('Cliente ausente'));
    await usuario.upload(document.querySelector('input[type="file"]') as HTMLInputElement, foto());
    expect(await screen.findByText('Foto del domicilio lista')).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Comentario (opcional)'), 'Nadie respondió');
    expect(screen.getByText('15/200')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Registrar fallo' }));
    expect(await screen.findByText('TRK-78904 quedó como No entregado. Este intento contó como 1 de 2.')).toBeInTheDocument();
    expect(screen.getByText('Cliente ausente')).toBeInTheDocument();
  });
});

describe('cierre y resumen', () => {
  it('lista pendientes, confirma el cierre y muestra los paquetes a devolver', async () => {
    iniciarSesionGuardada();
    const usuario = userEvent.setup();
    const puerto = espiar(crearOperacionDemo());
    montar('/repartidor/cierre', puerto);
    expect(await screen.findByText('3 despachos siguen pendientes')).toBeInTheDocument();
    expect(screen.getByText('1 despacho entregado hoy')).toBeInTheDocument();
    await usuario.click(within(screen.getByRole('main')).getByRole('button', { name: 'Cerrar jornada' }));
    expect(await screen.findByText(/3 despachos quedarán como No intentado y pasarás a Fuera de turno/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Sí, cerrar jornada' }));
    expect(await screen.findByText('Paquetes a devolver al centro')).toBeInTheDocument();
    expect(vi.mocked(puerto.cerrarJornada).mock.calls[0][1]).toMatch(UUID_V4);
    expect(screen.getAllByText('No intentado')).toHaveLength(3);
    await waitFor(() => expect(screen.getByText(/^Cerrada \d{2}:\d{2}$/)).toBeInTheDocument());
  });
});
