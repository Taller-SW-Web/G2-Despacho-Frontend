import { useRef, useState, type PropsWithChildren } from 'react';
import { ActionIcon, Button, MantineProvider, NumberInput, Radio, Select, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { accionesIconoUi, accionesUi, camposFormulario, tema } from '../index';

function Proveedor({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}

describe('CR-01 AccionesUi', () => {
  it('CCR-01-01: el consumidor bloquea dos activaciones síncronas y permite reintentar tras un fallo', async () => {
    const solicitar = vi.fn();
    function Contenedor() {
      const bloqueo = useRef(false);
      const [cargando, cargar] = useState(false);
      return <>
        <Button {...accionesUi.principal} type="button" loading={cargando} aria-busy={cargando} onClick={() => {
          if (bloqueo.current) return;
          bloqueo.current = true; cargar(true); solicitar();
        }}>Guardar zona</Button>
        <Button {...accionesUi.terciaria} type="button" onClick={() => { bloqueo.current = false; cargar(false); }}>Simular error recuperable</Button>
      </>;
    }
    render(<Contenedor />, { wrapper: Proveedor });
    const guardar = screen.getByRole('button', { name: 'Guardar zona' });
    act(() => { guardar.click(); guardar.click(); });
    expect(solicitar).toHaveBeenCalledTimes(1);
    expect(guardar).toBeDisabled();
    expect(guardar).toHaveTextContent('Guardar zona');
    expect(guardar).toHaveAttribute('aria-busy', 'true');
    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole('button', { name: 'Simular error recuperable' }));
    guardar.focus();
    await usuario.keyboard('{Enter}');
    expect(solicitar).toHaveBeenCalledTimes(2);
  });

  it('CCR-01-02: asocia el bloqueo visible y Cancelar no envía el formulario', async () => {
    const enviar = vi.fn();
    render(<form onSubmit={(evento) => { evento.preventDefault(); enviar(); }}>
      <Button {...accionesUi.principal} type="submit" disabled aria-describedby="motivo-zona">Guardar zona</Button>
      <p id="motivo-zona">Selecciona al menos un distrito.</p>
      <Button {...accionesUi.secundaria} type="button">Cancelar</Button>
    </form>, { wrapper: Proveedor });
    const usuario = userEvent.setup();
    const guardar = screen.getByRole('button', { name: 'Guardar zona' });
    expect(guardar).toHaveAccessibleDescription('Selecciona al menos un distrito.');
    await usuario.click(guardar);
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(enviar).not.toHaveBeenCalled();
  });

  it('la acción de icono conserva nombre accesible y se activa con Espacio', async () => {
    const accionar = vi.fn();
    render(<ActionIcon {...accionesIconoUi.movil} type="button" aria-label="Actualizar zonas" onClick={accionar}><span aria-hidden="true">↻</span></ActionIcon>, { wrapper: Proveedor });
    const usuario = userEvent.setup();
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'Actualizar zonas' })).toHaveFocus();
    await usuario.keyboard(' ');
    expect(accionar).toHaveBeenCalledTimes(1);
  });
});

describe('CR-02 CamposFormulario', () => {
  it('CCR-02-01: corrige el error asociado sin borrar los otros valores', async () => {
    function Formulario() {
      const [nombre, cambiarNombre] = useState('');
      const [error, cambiarError] = useState<string>();
      return <form noValidate onSubmit={(evento) => { evento.preventDefault(); cambiarError(nombre.trim() ? undefined : 'Ingresa el nombre de la zona.'); }}>
        <TextInput id="nombre-zona" label="Nombre de zona" required value={nombre} error={error} onChange={(evento) => { cambiarNombre(evento.currentTarget.value); cambiarError(undefined); }} />
        <TextInput id="referencia" label="Referencia" defaultValue="Lima Norte" />
        <Button type="submit">Validar</Button>
      </form>;
    }
    render(<Formulario />, { wrapper: Proveedor });
    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole('button', { name: 'Validar' }));
    const nombre = screen.getByRole('textbox', { name: 'Nombre de zona' });
    expect(nombre).toBeRequired();
    expect(nombre).toHaveAttribute('aria-invalid', 'true');
    expect(nombre).toHaveAccessibleDescription('Ingresa el nombre de la zona.');
    await usuario.type(nombre, 'Comas');
    expect(screen.queryByText('Ingresa el nombre de la zona.')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Referencia' })).toHaveValue('Lima Norte');
  });

  it('CCR-02-02: distingue sello sin respuesta de la respuesta No y permite seleccionarla con teclado', async () => {
    const confirmar = vi.fn();
    function Formulario() {
      const [sello, cambiarSello] = useState('');
      return <>
        <Radio.Group label="Sello intacto" required value={sello} onChange={cambiarSello}>
          <Radio value="si" label="Sí" /><Radio value="no" label="No" />
        </Radio.Group>
        <Button type="button" disabled={sello === ''} onClick={() => confirmar(sello === 'si')}>Confirmar recepción</Button>
      </>;
    }
    render(<Formulario />, { wrapper: Proveedor });
    const usuario = userEvent.setup();
    const confirmarBoton = screen.getByRole('button', { name: 'Confirmar recepción' });
    expect(confirmarBoton).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'No' })).not.toBeChecked();
    screen.getByRole('radio', { name: 'No' }).focus();
    await usuario.keyboard(' ');
    expect(confirmarBoton).toBeEnabled();
    await usuario.click(confirmarBoton);
    expect(confirmar).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('CCR-02-03: conserva vacío y cero y entrega números sin el texto PEN', async () => {
    const cambiar = vi.fn();
    function Importe() {
      const [valor, cambiarValor] = useState<string | number>('');
      return <NumberInput {...camposFormulario.moneda} id="tarifa" label="Tarifa base" min={0} allowNegative={false} value={valor} onChange={(nuevo) => { cambiarValor(nuevo); cambiar(nuevo); }} />;
    }
    render(<Importe />, { wrapper: Proveedor });
    const usuario = userEvent.setup();
    const importe = screen.getByRole('textbox', { name: 'Tarifa base' });
    expect(importe).toHaveValue('');
    await usuario.type(importe, '0');
    fireEvent.blur(importe);
    expect(importe).toHaveValue('0.00');
    expect(cambiar).toHaveBeenLastCalledWith(0);
    await usuario.clear(importe);
    expect(cambiar).toHaveBeenLastCalledWith('');
    expect(importe).toHaveValue('');
    expect(screen.getByText('PEN')).toBeVisible();
  });

  it('mantiene el DNI de solo lectura enfocable y asociado a su ayuda', async () => {
    render(<TextInput id="dni" label="DNI" value="12345678" readOnly description="El DNI no se puede modificar." />, { wrapper: Proveedor });
    const usuario = userEvent.setup();
    await usuario.tab();
    const dni = screen.getByRole('textbox', { name: 'DNI' });
    expect(dni).toHaveFocus();
    expect(dni).toBeEnabled();
    expect(dni).toHaveAccessibleDescription('El DNI no se puede modificar.');
    await usuario.type(dni, '9');
    expect(dni).toHaveValue('12345678');
  });

  it('la selección buscable informa Sin resultados sin seleccionar un valor inventado', async () => {
    const cambiar = vi.fn();
    render(<Select {...camposFormulario.seleccion} id="zona" label="Zona" searchable data={['Comas', 'Los Olivos']} value={null} onChange={cambiar} />, { wrapper: Proveedor });
    const usuario = userEvent.setup();
    await usuario.type(screen.getByRole('combobox', { name: 'Zona' }), 'Inexistente');
    expect(screen.getByText('Sin resultados')).toBeVisible();
    expect(cambiar).not.toHaveBeenCalled();
  });

  it('presenta la fecha civil DD/MM/YYYY sin desplazar el día por la zona horaria', () => {
    const cambiar = vi.fn();
    render(<DatePickerInput {...camposFormulario.fecha} id="fecha" label="Fecha programada" value="2026-10-16" onChange={cambiar} />, { wrapper: Proveedor });
    expect(screen.getByRole('button', { name: 'Fecha programada' })).toHaveTextContent('16/10/2026');
    expect(cambiar).not.toHaveBeenCalled();
  });
});
