import { Button, Text } from '@mantine/core';
import { ModalConfirmacion, notificarOperacion } from '@despacho/componentes-compartidos';
import type { ClienteApi } from '../../cliente/useClienteApi';
import type { Jornada } from './modelo';
import { cerrarJornada } from './api';
import { useMutacionJornada } from './useMutacionJornada';

export function ConfirmarCierreJornada({ cliente, jornada, habilitada, alCerrar, alGuardar, alDenegar }: {
  cliente: ClienteApi; jornada: Jornada; habilitada: boolean; alCerrar: () => void; alGuardar: () => void; alDenegar: () => void;
}) {
  const operacion = useMutacionJornada(alDenegar);
  return <ModalConfirmacion abierto titulo="Cerrar jornada" descripcion={`Se cerrará la jornada de ${jornada.placa} del ${jornada.fecha}. Los despachos pendientes deben resolverse antes; las reservas de retornos no se liberan con este cierre.`}
    etiquetaConfirmar="Cerrar jornada" intencion="destructiva" procesando={operacion.procesando} error={operacion.error}
    confirmacionDeshabilitada={!habilitada || operacion.incierta || jornada.estado !== 'ACTIVA'} alCancelar={alCerrar}
    alConfirmar={() => { if (!habilitada) return; void operacion.ejecutar(async () => {
      await cerrarJornada(cliente, jornada.idJornada);
      if (!operacion.estaVigente()) return;
      notificarOperacion({ id: `jornada-cierre-${jornada.idJornada}`, tipo: 'exito', mensaje: 'Jornada cerrada correctamente.' }); alGuardar();
    }); }}>
    {operacion.incierta && <><Text>Consulta el estado confirmado antes de repetir.</Text><Button variant="outline" onClick={alCerrar}>Consultar estado</Button></>}
  </ModalConfirmacion>;
}
