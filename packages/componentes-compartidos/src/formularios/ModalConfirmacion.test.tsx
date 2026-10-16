import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModalConfirmacion, tema } from '../index';
import type { PropiedadesModalConfirmacion } from '../index';

function ProveedorPruebas({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}

function preparar(cambios: Partial<PropiedadesModalConfirmacion> = {}) {
  const propiedades: PropiedadesModalConfirmacion = {
    abierto: true,
    titulo: '¿Desactivar la zona Lima Norte?',
    descripcion: 'La zona dejará de estar disponible para nuevas cotizaciones.',
    etiquetaConfirmar: 'Desactivar zona',
    alConfirmar: vi.fn(),
    alCancelar: vi.fn(),
    ...cambios,
  };
  const resultado = render(<ModalConfirmacion {...propiedades} />, { wrapper: ProveedorPruebas });
  return { ...resultado, propiedades };
}

describe('CR-12 ModalConfirmacion / CCR-12-01', () => {
  it('permanece desmontado cuando el consumidor lo mantiene cerrado', () => {
    preparar({ abierto: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('¿Desactivar la zona Lima Norte?')).not.toBeInTheDocument();
  });

  it('asocia el título y la descripción al diálogo y conserva el resumen del objeto', () => {
    preparar({ children: <p>Zona ZN-001 · Lima Norte</p> });
    const dialogo = screen.getByRole('dialog', { name: '¿Desactivar la zona Lima Norte?' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleDescription(expect.stringContaining('La zona dejará de estar disponible'));
    expect(screen.getByText('Zona ZN-001 · Lima Norte')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('en una acción destructiva enfoca Cancelar y devuelve el foco al disparador al cancelar con Esc', async () => {
    const usuario = userEvent.setup();
    function Contenedor() {
      const [abierto, cambiarAbierto] = useState(false);
      return <>
        <button type="button" onClick={() => cambiarAbierto(true)}>Dar de baja vehículo</button>
        <ModalConfirmacion abierto={abierto} intencion="destructiva" titulo="¿Dar de baja el vehículo DEMO-001?" descripcion="El vehículo dejará de estar disponible." etiquetaConfirmar="Dar de baja" alConfirmar={vi.fn()} alCancelar={() => cambiarAbierto(false)} />
      </>;
    }
    render(<Contenedor />, { wrapper: ProveedorPruebas });
    const disparador = screen.getByRole('button', { name: 'Dar de baja vehículo' });
    await usuario.click(disparador);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus());
    await usuario.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(disparador).toHaveFocus());
  });

  it('en la intención principal enfoca la confirmación habilitada', async () => {
    preparar();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Desactivar zona' })).toHaveFocus());
  });

  it.each(['Cancelar', 'Cerrar confirmación', 'Escape'])('solicita cancelación una vez mediante %s y deja la apertura bajo control del consumidor', async (via) => {
    const usuario = userEvent.setup();
    const { propiedades } = preparar({ intencion: 'destructiva' });
    if (via === 'Escape') await usuario.keyboard('{Escape}');
    else await usuario.click(screen.getByRole('button', { name: via }));
    expect(propiedades.alCancelar).toHaveBeenCalledExactlyOnceWith();
    expect(propiedades.alConfirmar).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('el clic en el fondo no solicita cancelación', async () => {
    const usuario = userEvent.setup();
    const { propiedades } = preparar();
    const fondo = document.querySelector<HTMLElement>('.mantine-Modal-overlay');
    expect(fondo).not.toBeNull();
    await usuario.click(fondo!);
    expect(propiedades.alCancelar).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('confirma con teclado sin cerrar el modal por su cuenta', async () => {
    const usuario = userEvent.setup();
    const { propiedades } = preparar();
    const confirmar = screen.getByRole('button', { name: 'Desactivar zona' });
    await waitFor(() => expect(confirmar).toHaveFocus());
    await usuario.keyboard('{Enter}');
    expect(propiedades.alConfirmar).toHaveBeenCalledExactlyOnceWith();
    expect(propiedades.alCancelar).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(confirmar).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('type', 'button');
  });

  it('bloquea únicamente la confirmación cuando la regla del consumidor no la permite', async () => {
    const usuario = userEvent.setup();
    const { propiedades } = preparar({ confirmacionDeshabilitada: true });
    const confirmar = screen.getByRole('button', { name: 'Desactivar zona' });
    expect(confirmar).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus());
    await usuario.click(confirmar);
    expect(propiedades.alConfirmar).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(propiedades.alCancelar).toHaveBeenCalledExactlyOnceWith();
  });

  it('durante el envío bloquea confirmación, Cancelar, cierre, Esc y clic en el fondo', async () => {
    const usuario = userEvent.setup();
    const { propiedades } = preparar({ procesando: true, intencion: 'destructiva' });
    const confirmar = screen.getByRole('button', { name: 'Desactivar zona' });
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    expect(confirmar).toBeDisabled();
    expect(confirmar).toHaveTextContent('Desactivar zona');
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    const cerrar = screen.getByRole('button', { name: 'Cerrar confirmación' });
    expect(cancelar).toBeDisabled();
    expect(cerrar).toBeDisabled();
    await usuario.click(confirmar);
    await usuario.click(cancelar);
    await usuario.click(cerrar);
    await usuario.keyboard('{Escape}');
    await usuario.click(document.querySelector<HTMLElement>('.mantine-Modal-overlay')!);
    expect(propiedades.alConfirmar).not.toHaveBeenCalled();
    expect(propiedades.alCancelar).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('permite al consumidor bloquear sincrónicamente la doble confirmación', async () => {
    const usuario = userEvent.setup();
    const confirmar = vi.fn();
    const cancelar = vi.fn();
    function Contenedor() {
      const [procesando, cambiarProcesando] = useState(false);
      return <ModalConfirmacion abierto titulo="¿Activar la zona Lima Norte?" descripcion="Estará disponible para nuevas cotizaciones." etiquetaConfirmar="Activar zona" procesando={procesando} alConfirmar={() => { cambiarProcesando(true); confirmar(); }} alCancelar={cancelar} />;
    }
    render(<Contenedor />, { wrapper: ProveedorPruebas });
    await usuario.dblClick(screen.getByRole('button', { name: 'Activar zona' }));
    await usuario.keyboard('{Escape}');
    expect(confirmar).toHaveBeenCalledExactlyOnceWith();
    expect(cancelar).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Activar zona' })).toBeDisabled();
  });
});

describe('CR-12 ModalConfirmacion / CCR-12-02', () => {
  it('al fallar conserva el objeto y el diálogo, muestra el error y permite reintentar', async () => {
    const usuario = userEvent.setup();
    const { propiedades, rerender } = preparar({ procesando: true, children: <p>Zona ZN-001 · Lima Norte</p> });
    const resumen = screen.getByText('Zona ZN-001 · Lima Norte');
    rerender(<ModalConfirmacion {...propiedades} procesando={false} error="No pudimos desactivar la zona. Inténtalo nuevamente." />);
    expect(screen.getByRole('dialog', { name: propiedades.titulo })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos desactivar la zona. Inténtalo nuevamente.');
    expect(screen.getByText('Zona ZN-001 · Lima Norte')).toBe(resumen);
    const confirmar = screen.getByRole('button', { name: 'Desactivar zona' });
    expect(confirmar).toBeEnabled();
    await usuario.click(confirmar);
    expect(propiedades.alConfirmar).toHaveBeenCalledExactlyOnceWith();
    expect(propiedades.alCancelar).not.toHaveBeenCalled();
  });

  it('permite cancelar después del fallo y retira el error cuando el consumidor lo limpia', async () => {
    const usuario = userEvent.setup();
    const { propiedades, rerender } = preparar({ error: 'No pudimos completar la operación.' });
    await usuario.keyboard('{Escape}');
    expect(propiedades.alCancelar).toHaveBeenCalledExactlyOnceWith();
    rerender(<ModalConfirmacion {...propiedades} error={undefined} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
