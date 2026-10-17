import { useState } from 'react';
import { Select, Text } from '@mantine/core';
import { ModalConfirmacion, notificarOperacion } from '@despacho/componentes-compartidos';
import { cambiarEstadoFurgoneta, darDeBaja } from './api';
import { estadosFurgoneta, transicionesFurgoneta, type EstadoFurgoneta, type Furgoneta, type Repartidor } from './modelo';
import { useOperacionFlota } from './useOperacionFlota';
import type { ClienteApi } from '../../cliente/useClienteApi';

type Recurso = { tipo: 'repartidor'; valor: Repartidor } | { tipo: 'furgoneta'; valor: Furgoneta };
export function ConfirmacionEstadoFlota({ recurso, cliente, alCerrar, alGuardar, alDenegar }: {
  recurso: Recurso; cliente: ClienteApi; alCerrar: () => void; alGuardar: () => void; alDenegar: () => void;
}) {
  const [nuevoEstado, establecerEstado] = useState<EstadoFurgoneta | null>(null);
  const operacion = useOperacionFlota(alDenegar);
  const baja = recurso.tipo === 'repartidor';
  const opciones = recurso.tipo === 'furgoneta' ? transicionesFurgoneta(recurso.valor.estado) : [];
  const etiqueta = baja ? `${recurso.valor.nombres} ${recurso.valor.apellidos}` : recurso.valor.placa;
  return <ModalConfirmacion abierto titulo={baja ? 'Dar de baja al repartidor' : 'Cambiar estado de furgoneta'}
    descripcion={baja ? 'Se conservará su historial. No podrá recibir nuevas asignaciones ni operar como repartidor. Esta baja no desactiva su cuenta global.'
      : 'El cambio puede cerrar una jornada sin despachos en curso. Si tiene despachos asignados o en camino, el servidor rechazará el retiro.'}
    etiquetaConfirmar={baja ? 'Confirmar baja' : 'Confirmar cambio'} intencion="destructiva"
    procesando={operacion.procesando} error={operacion.error || undefined}
    confirmacionDeshabilitada={operacion.desconocido || (!baja && !nuevoEstado)}
    alCancelar={alCerrar} alConfirmar={() => {
      if (!baja && !nuevoEstado) return;
      void operacion.ejecutar(baja ? 'baja' : 'estado', async () => {
        if (recurso.tipo === 'repartidor') await darDeBaja(cliente, recurso.valor.idRepartidor);
        else if (nuevoEstado && opciones.includes(nuevoEstado)) await cambiarEstadoFurgoneta(cliente, recurso.valor.idFurgoneta, nuevoEstado);
        else return;
        if (!operacion.estaVigente()) return;
        notificarOperacion({ id: `estado-${recurso.tipo}-${baja ? recurso.valor.idRepartidor : recurso.valor.idFurgoneta}`, tipo: 'exito',
          mensaje: baja ? 'Baja lógica registrada. El historial se conserva.' : 'Cambio de estado registrado. Se actualizará el listado.' });
        alGuardar();
      });
    }}>
    <Text fw={600}>{etiqueta}</Text>
    {!baja && <Select label="Nuevo estado" required data={estadosFurgoneta.filter(({ value }) => opciones.includes(value as EstadoFurgoneta))}
      value={nuevoEstado} disabled={operacion.procesando || operacion.desconocido} allowDeselect={false}
      onChange={(valor) => establecerEstado(valor as EstadoFurgoneta | null)} />}
    {operacion.desconocido && <Text>Cierra esta confirmación y consulta el listado antes de volver a enviar un cambio.</Text>}
  </ModalConfirmacion>;
}
