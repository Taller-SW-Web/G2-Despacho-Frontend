import { useState } from 'react';
import { Alert, Select, SimpleGrid, TextInput, Title } from '@mantine/core';
import { notificarOperacion } from '@despacho/componentes-compartidos';
import { editarRepartidor, registrarRepartidor } from './api';
import { datosContacto, datosRepartidor, erroresCampos, turnos, type Repartidor } from './modelo';
import { useOperacionFlota } from './useOperacionFlota';
import { ModalFormularioFlota } from './ModalFormularioFlota';
import type { ClienteApi } from '../../cliente/useClienteApi';

export function FormularioRepartidor({ repartidor, cliente, alCerrar, alGuardar, alDenegar }: {
  repartidor?: Repartidor; cliente: ClienteApi; alCerrar: () => void; alGuardar: () => void; alDenegar: () => void;
}) {
  const [valores, establecerValores] = useState(() => ({ nombres: repartidor?.nombres ?? '', apellidos: repartidor?.apellidos ?? '',
    dni: repartidor?.dni ?? '', telefono: repartidor?.telefono ?? '', correo: repartidor?.correo ?? '',
    numeroBrevete: repartidor?.numeroBrevete ?? '', turnoHabitual: repartidor?.turnoHabitual ?? '' }));
  const [tocados, establecerTocados] = useState<Record<string, boolean>>({});
  const operacion = useOperacionFlota(alDenegar);
  const esquema = repartidor ? datosContacto : datosRepartidor;
  const validacion = esquema.safeParse(valores);
  const errores = validacion.success ? {} : erroresCampos(validacion.error);
  const cambiar = (campo: keyof typeof valores, valor: string) => {
    establecerValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    operacion.establecerError('');
    operacion.corregirCampo(campo);
  };
  const campo = (nombre: keyof typeof valores, etiqueta: string, maxLength: number, readOnly = false) => <TextInput
    label={etiqueta} required value={valores[nombre]} readOnly={readOnly} maxLength={maxLength}
    type={nombre === 'correo' ? 'email' : nombre === 'telefono' ? 'tel' : 'text'}
    inputMode={nombre === 'dni' ? 'numeric' : undefined} error={operacion.campos[nombre] ?? (nombre === 'dni' && !repartidor && operacion.conflicto ? 'Revisa si este DNI ya está registrado.' : tocados[nombre] ? errores[nombre] : undefined)}
    onBlur={() => establecerTocados((anteriores) => ({ ...anteriores, [nombre]: true }))}
    onChange={(evento) => cambiar(nombre, evento.currentTarget.value)} />;
  return <ModalFormularioFlota titulo={repartidor ? 'Editar repartidor' : 'Nuevo repartidor'} {...operacion} invalido={!validacion.success}
    alCerrar={alCerrar} alEnviar={(evento) => {
      evento.preventDefault();
      if (!validacion.success) return;
      void operacion.ejecutar(repartidor ? 'edicion' : 'registro', async () => {
        const confirmado = repartidor
          ? await editarRepartidor(cliente, repartidor.idRepartidor, datosContacto.parse(valores))
          : await registrarRepartidor(cliente, datosRepartidor.parse(valores));
        if (repartidor && confirmado.idRepartidor !== repartidor.idRepartidor) throw new Error('Recurso no correspondiente');
        if (confirmado.dni !== valores.dni) throw new Error('Identidad no correspondiente');
        if (!operacion.estaVigente()) return;
        notificarOperacion({ id: `repartidor-${confirmado.idRepartidor}`, tipo: !repartidor && confirmado.estadoVinculacion !== 'VINCULADO' ? 'efectoPendiente' : 'exito',
          mensaje: repartidor ? 'Datos del repartidor actualizados.' : confirmado.estadoVinculacion === 'VINCULADO' ? 'Repartidor registrado y vinculado.' : 'Repartidor registrado. La vinculación de su cuenta está pendiente.' });
        alGuardar();
      });
    }}>
    <Title order={2} size="h4">Datos personales</Title>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      {campo('nombres', 'Nombres', 80, Boolean(repartidor))}{campo('apellidos', 'Apellidos', 80, Boolean(repartidor))}
      {campo('dni', 'DNI', 8, Boolean(repartidor))}{campo('telefono', 'Teléfono', 20)}{campo('correo', 'Correo electrónico', 120)}
    </SimpleGrid>
    <Title order={2} size="h4">Datos operativos</Title>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      {campo('numeroBrevete', 'Número de brevete', 20)}
      <Select required label="Turno habitual" data={turnos} value={valores.turnoHabitual || null} allowDeselect={false}
        onBlur={() => establecerTocados((anteriores) => ({ ...anteriores, turnoHabitual: true }))}
        error={operacion.campos.turnoHabitual ?? (tocados.turnoHabitual ? errores.turnoHabitual : undefined)} onChange={(valor) => cambiar('turnoHabitual', valor ?? '')} />
    </SimpleGrid>
    {!repartidor && <Alert color="blue" variant="light" c="ink.9">El registro crea el perfil local. Solicita al administrador la cuenta en Seguridad y vincula su identificador desde el listado.</Alert>}
  </ModalFormularioFlota>;
}
