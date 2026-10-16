import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VisorEvidencia, tema } from '../index';
import type { PropiedadesVisorEvidencia } from '../index';

// Rutas ficticias de pruebas; nunca se utilizan autorizaciones reales.
const urlA = '/__pruebas__/evidencia-a.svg';
const urlB = '/__pruebas__/evidencia-b.svg';

function ProveedorPruebas({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}

function preparar(cambios: Partial<PropiedadesVisorEvidencia> = {}) {
  const propiedades = {
    abierto: true, estado: 'lista', urlAutorizada: urlA,
    descripcion: 'Evidencia de entrega del despacho DEMO-A',
    alCerrar: vi.fn(), alSolicitarAcceso: vi.fn(), alFallarImagen: vi.fn(),
    ...cambios,
  } as PropiedadesVisorEvidencia;
  return { ...render(<VisorEvidencia {...propiedades} />, { wrapper: ProveedorPruebas }), propiedades };
}

type ReferenciaPrueba = { idDespacho: string; idIncidencia: string; idEvidencia: string };
type RespuestaPrueba = { idDespacho: string; idEvidencia: string; urlLectura: string; venceEn: string };
const referenciaInicial: ReferenciaPrueba = { idDespacho: 'DEMO-A', idIncidencia: 'INC-A', idEvidencia: 'EVI-A' };
const respuestaInicial: RespuestaPrueba = { idDespacho: 'DEMO-A', idEvidencia: 'EVI-A', urlLectura: urlA, venceEn: '2026-10-16T20:00:00Z' };

/** Doble del futuro consumidor: el visor no recibe ni verifica estas identidades. */
function crearConsumidorSimulado() {
  const pendientes: ((respuesta: RespuestaPrueba) => void)[] = [];
  function Contenedor({ referencia }: { referencia: ReferenciaPrueba }) {
    const [consulta, cambiarConsulta] = useState<{ referencia: ReferenciaPrueba; respuesta?: RespuestaPrueba }>();
    const { idDespacho, idIncidencia, idEvidencia } = referencia;
    useEffect(() => {
      let vigente = true;
      const solicitud = new Promise<RespuestaPrueba>((resolver) => { pendientes.push(resolver); });
      void solicitud.then((respuesta) => {
        if (!vigente) return;
        const coincide = respuesta.idDespacho === idDespacho && respuesta.idEvidencia === idEvidencia;
        cambiarConsulta({ referencia, respuesta: coincide ? respuesta : undefined });
      });
      return () => { vigente = false; };
    }, [idDespacho, idIncidencia, idEvidencia]);
    const coincide = consulta?.referencia.idDespacho === idDespacho
      && consulta.referencia.idIncidencia === idIncidencia
      && consulta.referencia.idEvidencia === idEvidencia;
    const acceso = coincide
      ? consulta.respuesta ? { estado: 'lista' as const, urlAutorizada: consulta.respuesta.urlLectura } : { estado: 'error' as const }
      : { estado: 'carga' as const };
    return <VisorEvidencia {...acceso} abierto descripcion={`Evidencia de ${idDespacho}, incidencia ${idIncidencia}`} alCerrar={vi.fn()} alSolicitarAcceso={vi.fn()} alFallarImagen={vi.fn()} />;
  }
  return { Contenedor, pendientes };
}

describe('CR-18 VisorEvidencia', () => {
  it('cerrado no monta la imagen ni su URL', () => {
    preparar({ abierto: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(urlA);
  });

  it('durante la autorización muestra carga y omite cualquier URL anterior recibida', () => {
    preparar({ estado: 'carga' });
    expect(screen.getByRole('region', { name: 'Cargando fotografía de evidencia' })).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelector('img')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(urlA);
  });

  it('muestra solo la referencia autorizada y mantiene la imagen oculta hasta que carga', () => {
    preparar();
    const imagen = screen.getByAltText('Evidencia de entrega del despacho DEMO-A');
    expect(imagen).toHaveAttribute('src', urlA);
    expect(imagen).toHaveStyle({ visibility: 'hidden' });
    expect(screen.getByRole('region', { name: 'Fotografía de evidencia' })).toHaveAttribute('aria-busy', 'true');
    fireEvent.load(imagen);
    expect(imagen).toHaveStyle({ visibility: 'visible' });
    expect(screen.getByRole('region', { name: 'Fotografía de evidencia' })).toHaveAttribute('aria-busy', 'false');
    expect(document.querySelector('[href]')).not.toBeInTheDocument();
  });

  it('asocia título y contenido del visor y enfoca el cierre', async () => {
    preparar();
    expect(screen.getByRole('dialog', { name: 'Evidencia del despacho' })).toHaveAccessibleDescription();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cerrar visor de evidencia' })).toHaveFocus());
  });

  it.each(['Cerrar visor de evidencia', 'Volver', 'Escape'])('solicita el cierre mediante %s sin decidir la apertura', async (via) => {
    const usuario = userEvent.setup();
    const { propiedades } = preparar();
    if (via === 'Escape') await usuario.keyboard('{Escape}');
    else await usuario.click(screen.getByRole('button', { name: via }));
    expect(propiedades.alCerrar).toHaveBeenCalledExactlyOnceWith();
    expect(propiedades.alSolicitarAcceso).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('al cerrar y reabrir en carga no conserva la URL de la apertura anterior', () => {
    const { propiedades, rerender } = preparar();
    fireEvent.load(screen.getByAltText(propiedades.descripcion));
    rerender(<VisorEvidencia {...propiedades} abierto={false} />);
    expect(document.body.innerHTML).not.toContain(urlA);
    expect(document.querySelector('img')).not.toBeInTheDocument();
    rerender(<VisorEvidencia {...propiedades} estado="carga" urlAutorizada={null} />);
    expect(document.body.innerHTML).not.toContain(urlA);
    expect(screen.getByRole('region', { name: 'Cargando fotografía de evidencia' })).toBeInTheDocument();
  });

  it('devuelve el foco al disparador después de cerrar', async () => {
    const usuario = userEvent.setup();
    function Contenedor() {
      const [abierto, cambiarAbierto] = useState(false);
      return <>
        <button type="button" onClick={() => cambiarAbierto(true)}>Ver evidencia de prueba</button>
        <VisorEvidencia abierto={abierto} estado="lista" urlAutorizada={urlA} descripcion="Evidencia de prueba DEMO-A" alCerrar={() => cambiarAbierto(false)} alSolicitarAcceso={vi.fn()} alFallarImagen={vi.fn()} />
      </>;
    }
    render(<Contenedor />, { wrapper: ProveedorPruebas });
    const disparador = screen.getByRole('button', { name: 'Ver evidencia de prueba' });
    await usuario.click(disparador);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cerrar visor de evidencia' })).toHaveFocus());
    await usuario.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(disparador).toHaveFocus());
  });

  it('distingue ausencia de evidencia y usa No intentado solo cuando el consumidor lo confirma', () => {
    const { propiedades, rerender } = preparar({ estado: 'sinEvidencia' });
    expect(screen.getByRole('heading', { name: 'Sin evidencia fotográfica' })).toBeInTheDocument();
    expect(screen.queryByText(/No intentado/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    rerender(<VisorEvidencia {...propiedades} estado="sinEvidencia" mensajeSinEvidencia="No intentado — sin foto" />);
    expect(screen.getByText('No intentado — sin foto')).toBeInTheDocument();
  });

  it('notifica una sola vez el fallo de la imagen y retira su URL sin inferir expiración', async () => {
    const usuario = userEvent.setup();
    const { propiedades } = preparar();
    const imagen = screen.getByAltText(propiedades.descripcion);
    fireEvent.error(imagen);
    fireEvent.error(imagen);
    expect(propiedades.alFallarImagen).toHaveBeenCalledExactlyOnceWith();
    expect(document.querySelector('img')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(urlA);
    expect(screen.getByRole('heading', { name: 'No pudimos mostrar la evidencia' })).toBeInTheDocument();
    expect(screen.queryByText(/expiró/)).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(propiedades.alSolicitarAcceso).toHaveBeenCalledExactlyOnceWith();
  });

  it('rechaza la visualización sin referencia utilizable sin fabricar una URL', () => {
    preparar({ urlAutorizada: '   ' });
    expect(document.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No pudimos mostrar la evidencia' })).toBeInTheDocument();
  });
});

describe('CCR-18-01: expiración y renovación', () => {
  it('mantiene el foco dentro del visor cuando la renovación sustituye el botón por carga', async () => {
    const usuario = userEvent.setup();
    function Contenedor() {
      const [estado, cambiarEstado] = useState<'expirada' | 'carga'>('expirada');
      return <VisorEvidencia abierto estado={estado} descripcion="Evidencia del despacho DEMO-A" alCerrar={vi.fn()} alSolicitarAcceso={() => cambiarEstado('carga')} alFallarImagen={vi.fn()} />;
    }
    render(<Contenedor />, { wrapper: ProveedorPruebas });
    await usuario.click(screen.getByRole('button', { name: 'Volver a cargar' }));
    expect(screen.getByRole('region', { name: 'Cargando fotografía de evidencia' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cerrar visor de evidencia' })).toHaveFocus());
  });

  it.each([['expirada', 'Volver a cargar'], ['error', 'Reintentar']] as const)('en %s solicita la renovación sin consultar ni construir rutas', async (estado, etiqueta) => {
    const usuario = userEvent.setup();
    const { propiedades } = preparar({ estado });
    expect(document.body.innerHTML).not.toContain(urlA);
    expect(document.querySelector('img, a')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: etiqueta }));
    expect(propiedades.alSolicitarAcceso).toHaveBeenCalledExactlyOnceWith();
    expect(propiedades.alCerrar).not.toHaveBeenCalled();
    expect(propiedades.alFallarImagen).not.toHaveBeenCalled();
  });
});

describe('CCR-18-02: retirar evidencia anterior', () => {
  it.each(['carga', 'sinEvidencia', 'expirada', 'error', 'sinPermiso'] as const)('al pasar a %s retira foto y URL, aunque el consumidor aún entregue la referencia vieja', (estado) => {
    const { propiedades, rerender } = preparar();
    fireEvent.load(screen.getByAltText(propiedades.descripcion));
    rerender(<VisorEvidencia {...propiedades} estado={estado} />);
    expect(document.querySelector('img')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(urlA);
    expect(screen.queryByText(propiedades.descripcion)).not.toBeInTheDocument();
  });

  it('al cambiar la referencia monta otra imagen oculta hasta su carga y no conserva la foto anterior', () => {
    const { propiedades, rerender } = preparar();
    const anterior = screen.getByAltText(propiedades.descripcion);
    fireEvent.load(anterior);
    rerender(<VisorEvidencia {...propiedades} estado="lista" urlAutorizada={urlB} descripcion="Evidencia de fallo del despacho DEMO-B" />);
    const siguiente = screen.getByAltText('Evidencia de fallo del despacho DEMO-B');
    expect(siguiente).not.toBe(anterior);
    expect(document.body.innerHTML).not.toContain(urlA);
    expect(siguiente).toHaveAttribute('src', urlB);
    expect(siguiente).toHaveStyle({ visibility: 'hidden' });
    fireEvent.load(anterior);
    expect(siguiente).toHaveStyle({ visibility: 'hidden' });
    fireEvent.load(siguiente);
    expect(siguiente).toHaveStyle({ visibility: 'visible' });
  });

  it.each([
    ['despacho', { idDespacho: 'DEMO-B', idIncidencia: 'INC-B', idEvidencia: 'EVI-B' }],
    ['evidencia dentro del mismo despacho', { ...referenciaInicial, idEvidencia: 'EVI-B' }],
    ['incidencia dentro del mismo despacho', { ...referenciaInicial, idIncidencia: 'INC-B' }],
  ] as const)('el consumidor simulado descarta la respuesta anterior al cambiar de %s', async (_, referencia) => {
    const { Contenedor, pendientes } = crearConsumidorSimulado();
    const { rerender } = render(<Contenedor referencia={referenciaInicial} />, { wrapper: ProveedorPruebas });
    rerender(<Contenedor referencia={referencia} />);
    expect(document.querySelector('img')).not.toBeInTheDocument();
    await act(async () => pendientes[1]({ ...respuestaInicial, idDespacho: referencia.idDespacho, idEvidencia: referencia.idEvidencia, urlLectura: urlB }));
    const imagen = screen.getByAltText(`Evidencia de ${referencia.idDespacho}, incidencia ${referencia.idIncidencia}`);
    expect(imagen).toHaveAttribute('src', urlB);
    await act(async () => pendientes[0](respuestaInicial));
    expect(document.body.innerHTML).not.toContain(urlA);
    expect(imagen).toHaveAttribute('src', urlB);
  });

  it.each([
    { ...respuestaInicial, idDespacho: 'OTRO-DESPACHO' },
    { ...respuestaInicial, idEvidencia: 'OTRA-EVIDENCIA' },
  ])('el consumidor simulado no entrega una autorización de otro recurso al visor: %j', async (respuesta) => {
    const { Contenedor, pendientes } = crearConsumidorSimulado();
    render(<Contenedor referencia={referenciaInicial} />, { wrapper: ProveedorPruebas });
    await act(async () => pendientes[0](respuesta));
    expect(document.querySelector('img')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(urlA);
    expect(screen.getByRole('heading', { name: 'No pudimos mostrar la evidencia' })).toBeInTheDocument();
  });
});
