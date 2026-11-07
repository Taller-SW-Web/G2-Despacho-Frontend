import { useCallback, useState } from 'react';
import { Alert, Button, Group, Modal, Select, Skeleton, Stack, Text } from '@mantine/core';
import { EstadoVista, notificarOperacion } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { useLecturaProgramacion } from '../programacion/useLecturaProgramacion';
import { consultarElegibles, generarRecojoPrueba, interpretarErrorRecojo } from './api';

/** ES-F02-09 UI-01: mientras no haya acuerdo con Ventas, los recojos solo nacen de despachos simulados entregados. */
export function ModalGenerarRecojo({ alCerrar, alGenerar }: { alCerrar: () => void; alGenerar: () => void }) {
  const cliente = useClienteApi();
  const cargar = useCallback((signal: AbortSignal) => consultarElegibles(cliente, signal), [cliente]);
  const consulta = useLecturaProgramacion(cargar);
  const [despacho, seleccionar] = useState<string | null>(null);
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState<string | null>(null);
  const opciones = (consulta.datos ?? []).map((d) => ({ value: d.idDespacho, label: `${d.codigoRastreoInterno} · ${d.direccion}, ${d.distrito}` }));
  const generar = async () => {
    if (!despacho || guardando) return;
    establecerGuardando(true); establecerError(null);
    try {
      const recojo = await generarRecojoPrueba(cliente, despacho);
      notificarOperacion({ id: `recojo-${recojo.idRecojo}`, tipo: 'exito', mensaje: `Recojo de prueba de ${recojo.codigoRastreoInterno} generado.` });
      alGenerar();
    } catch (fallo) {
      establecerError(interpretarErrorRecojo(fallo, true).mensaje); establecerGuardando(false);
    }
  };
  return <Modal opened onClose={alCerrar} title="Generar recojo de prueba" centered closeOnClickOutside={!guardando} closeOnEscape={!guardando}>
    <Stack gap="md">
      <Text size="sm">Elige un despacho simulado ya entregado. No se informa a Ventas y Postventa.</Text>
      {consulta.cargando ? <Skeleton height={64} aria-label="Cargando despachos" />
        : consulta.error ? <EstadoVista estado="error" descripcion={consulta.error.mensaje} accion={{ id: 'reintentar', etiqueta: 'Reintentar' }} alAccionar={consulta.actualizar} />
        : opciones.length === 0 ? <EstadoVista estado="vacio" titulo="No hay despachos simulados entregados" descripcion="Entrega primero un despacho de prueba desde la app del repartidor." />
        : <Select label="Despacho entregado" required searchable data={opciones} value={despacho} onChange={seleccionar} disabled={guardando} />}
      {error && <Alert color="red" role="alert">{error}</Alert>}
      <Group justify="flex-end">
        <Button type="button" variant="outline" disabled={guardando} onClick={alCerrar}>Cancelar</Button>
        <Button type="button" loading={guardando} disabled={!despacho} onClick={() => void generar()}>Generar recojo</Button>
      </Group>
    </Stack>
  </Modal>;
}
