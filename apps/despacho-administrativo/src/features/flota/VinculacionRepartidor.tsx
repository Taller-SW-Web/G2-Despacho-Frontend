import { useState } from 'react';
import { Alert, Text, TextInput } from '@mantine/core';
import { notificarOperacion } from '@despacho/componentes-compartidos';
import { vincularRepartidor } from './api';
import { datosVinculacion, type Repartidor } from './modelo';
import { useOperacionFlota } from './useOperacionFlota';
import { ModalFormularioFlota } from './ModalFormularioFlota';
import type { ClienteApi } from '../../cliente/useClienteApi';

export function VinculacionRepartidor({ repartidor, cliente, alCerrar, alGuardar, alDenegar }: {
  repartidor: Repartidor; cliente: ClienteApi; alCerrar: () => void; alGuardar: () => void; alDenegar: () => void;
}) {
  const [usuarioId, establecerUsuarioId] = useState(repartidor.usuarioId ?? '');
  const [tocado, establecerTocado] = useState(false);
  const validacion = datosVinculacion.safeParse({ usuarioId });
  const operacion = useOperacionFlota(alDenegar);
  return <ModalFormularioFlota titulo="Vincular cuenta de usuario" {...operacion} invalido={!validacion.success} alCerrar={alCerrar}
    alEnviar={(evento) => {
      evento.preventDefault(); if (!validacion.success) return;
      void operacion.ejecutar('vinculacion', async () => {
        await vincularRepartidor(cliente, repartidor.idRepartidor, validacion.data.usuarioId);
        if (!operacion.estaVigente()) return;
        notificarOperacion({ id: `vinculacion-${repartidor.idRepartidor}`, tipo: 'exito', mensaje: 'Vinculación registrada. Consulta el estado actualizado en el listado.' });
        alGuardar();
      });
    }}>
    <Text fw={600}>{repartidor.nombres} {repartidor.apellidos} · DNI {repartidor.dni}</Text>
    <Alert color="blue" variant="light" c="ink.9">La cuenta debe estar creada previamente por el administrador de Seguridad. Esta operación asocia su identificador al perfil local y no crea ni modifica credenciales.</Alert>
    <TextInput label="Identificador de usuario" description="Utiliza el identificador comunicado por Seguridad para esta persona." required value={usuarioId}
      onChange={(evento) => { establecerUsuarioId(evento.currentTarget.value); operacion.corregirCampo('usuarioId'); }} onBlur={() => establecerTocado(true)}
      error={operacion.campos.usuarioId ?? (tocado && !validacion.success ? validacion.error.issues[0].message : undefined)} />
  </ModalFormularioFlota>;
}
