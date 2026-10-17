import { MantineProvider } from '@mantine/core';
import { Notifications, notifications, notificationsStore } from '@mantine/notifications';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notificarOperacion, tema } from '../index';

afterEach(() => { notifications.clean(); vi.useRealTimers(); });
function montar() { render(<MantineProvider theme={tema} env="test"><Notifications transitionDuration={0} /></MantineProvider>); }

describe('CR-15 NotificacionOperacion', () => {
  it('CCR-15-01: conserva el efecto pendiente registrado, sin autocierre', () => {
    montar();
    act(() => { notificarOperacion({ id: 'cierre-1', tipo: 'efectoPendiente', mensaje: 'Cierre registrado. Notificación a Ventas pendiente.' }); });
    expect(screen.getByRole('status')).toHaveTextContent('Cierre registrado. Notificación a Ventas pendiente.');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(notificationsStore.getState().notifications[0].autoClose).toBe(false);
  });
  it('cierra el éxito después de cuatro segundos', async () => {
    vi.useFakeTimers(); montar();
    act(() => { notificarOperacion({ id: 'exito', tipo: 'exito', mensaje: 'Zona registrada.' }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3999); });
    expect(screen.getByText('Zona registrada.')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(2); });
    expect(notificationsStore.getState().notifications).toHaveLength(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.queryByText('Zona registrada.')).not.toBeInTheDocument();
  });
  it('actualiza por id sin duplicar y mantiene información persistente', () => {
    montar();
    act(() => { notificarOperacion({ id: 'operacion', tipo: 'efectoPendiente', mensaje: 'Efecto pendiente.' }); });
    act(() => { expect(notificarOperacion({ id: 'operacion', tipo: 'informacion', mensaje: 'Consulta el detalle.' })).toBe('operacion'); });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByText('Efecto pendiente.')).not.toBeInTheDocument();
    expect(notificationsStore.getState().notifications[0].autoClose).toBe(false);
  });
  it('emite el identificador de la acción y respeta el bloqueo', async () => {
    const usuario = userEvent.setup(); const alAccionar = vi.fn(); montar();
    act(() => { notificarOperacion({ id: 'accion', tipo: 'informacion', mensaje: 'Consulta disponible.', accion: { id: 'detalle', etiqueta: 'Ver detalle' }, alAccionar }); });
    await usuario.click(screen.getByRole('button', { name: 'Ver detalle' }));
    expect(alAccionar).toHaveBeenCalledExactlyOnceWith('detalle');
    act(() => { notificarOperacion({ id: 'accion', tipo: 'informacion', mensaje: 'Consulta disponible.', accion: { id: 'detalle', etiqueta: 'Ver detalle', disabled: true, motivoDeshabilitado: 'Actualizando permisos.' }, alAccionar }); });
    expect(screen.getByRole('button', { name: 'Ver detalle' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ver detalle' })).toHaveAccessibleDescription('Actualizando permisos.');
    await usuario.click(screen.getByRole('button', { name: 'Cerrar notificación' }));
    expect(screen.queryByText('Consulta disponible.')).not.toBeInTheDocument();
  });
});
