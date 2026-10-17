import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Group, Loader, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { EstadoVista, notificarOperacion } from '@despacho/componentes-compartidos';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { abrirJornada, cargarRecursos } from './api';
import { apertura } from './modelo';
import { useConsultaJornadas } from './useConsultaJornadas';
import { useMutacionJornada } from './useMutacionJornada';

export function FormularioJornada({ cliente, fecha, alCerrar, alGuardar, alDenegar, habilitada }: {
  cliente: ClienteApi; fecha: string; alCerrar: () => void; alGuardar: () => void; alDenegar: () => void; habilitada: boolean;
}) {
  const cargar = useCallback((signal: AbortSignal) => cargarRecursos(cliente, signal), [cliente]);
  const recursos = useConsultaJornadas(cargar);
  const operacion = useMutacionJornada(alDenegar);
  const [repartidor, seleccionarRepartidor] = useState<string | null>(null);
  const [furgoneta, seleccionarFurgoneta] = useState<string | null>(null);
  const [zona, seleccionarZona] = useState<string | null>(null);
  useEffect(() => { if (recursos.denegado) alDenegar(); }, [recursos.denegado, alDenegar]);
  const datos = apertura.safeParse({ idRepartidor: repartidor, idFurgoneta: furgoneta, idZona: zona, fecha });
  const cerrado = !habilitada || !recursos.confirmada || operacion.procesando || operacion.incierta;
  return <Modal opened onClose={() => { if (!operacion.procesando) alCerrar(); }} title="Abrir jornada" size="lg" centered
    closeOnClickOutside={false} closeOnEscape={!operacion.procesando} closeButtonProps={{ disabled: operacion.procesando, 'aria-label': 'Cerrar formulario de jornada' }}>
    <form noValidate aria-busy={operacion.procesando} onSubmit={(evento) => {
      evento.preventDefault(); if (!datos.success || cerrado) return;
      void operacion.ejecutar(async () => {
        await abrirJornada(cliente, datos.data);
        if (!operacion.estaVigente()) return;
        notificarOperacion({ id: 'jornada-abierta', tipo: 'exito', mensaje: 'Jornada abierta correctamente.' }); alGuardar();
      });
    }}><Stack gap="md">
      <Text>Selecciona los recursos del catálogo. El servidor confirmará que siguen disponibles.</Text>
      {operacion.error && <Alert color="red" c="ink.9" role="alert">{operacion.error}</Alert>}
      {recursos.error && <Alert color="red" c="ink.9" role="alert">{recursos.error}<Button variant="subtle" onClick={recursos.actualizar}>Reintentar catálogos</Button></Alert>}
      <EstadoVista estado={recursos.cargando && !recursos.datos ? 'carga' : 'datos'} esqueleto={<Loader aria-label="Cargando recursos" />}>
        <fieldset disabled={cerrado} style={{ border: 0, padding: 0 }}><Stack gap="md">
          <TextInput label="Fecha de la jornada" type="date" value={fecha} readOnly required description="Fecha actual de Operación en America/Bogota." />
          <Select label="Repartidor" required searchable clearable data={recursos.datos?.repartidores ?? []} value={repartidor} onChange={seleccionarRepartidor} nothingFoundMessage="No hay repartidores activos y vinculados" />
          <Select label="Furgoneta" required searchable clearable data={recursos.datos?.furgonetas ?? []} value={furgoneta} onChange={seleccionarFurgoneta} nothingFoundMessage="No hay furgonetas disponibles" />
          <Select label="Zona" required searchable clearable data={recursos.datos?.zonas ?? []} value={zona} onChange={seleccionarZona} nothingFoundMessage="No hay zonas activas" />
        </Stack></fieldset>
      </EstadoVista>
      {operacion.incierta && <Text>Los datos ingresados se conservan. Consulta el tablero para comprobar si se creó la jornada.</Text>}
      <Group justify="flex-end">
        <Button type="button" variant="outline" disabled={operacion.procesando} onClick={alCerrar}>{operacion.incierta ? 'Consultar estado' : 'Cancelar'}</Button>
        <Button type="submit" loading={operacion.procesando} disabled={cerrado || !datos.success}>Abrir jornada</Button>
      </Group>
    </Stack></form>
  </Modal>;
}
