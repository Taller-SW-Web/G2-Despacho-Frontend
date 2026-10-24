import { Button, Card, Stack, Text, Title } from '@mantine/core';
import { IconArrowBackUp, IconCalendarRepeat, IconPackageImport } from '@tabler/icons-react';
import type { AccionIncidencia, ContextoDecisionIncidencia, DestinosDetalleIncidencia, DetalleIncidencia } from './modeloDetalle';
import clases from './DetalleIncidencia.module.css';

export function PanelDecisionIncidencia({ detalle, bloqueada, destinos, alCompletar }: {
  detalle: DetalleIncidencia; bloqueada: boolean; destinos: DestinosDetalleIncidencia; alCompletar: ContextoDecisionIncidencia['alCompletar'];
}) {
  if (detalle.estado !== 'FALLIDO') return null;
  const mensajes: Record<string, string> = {
    RECEPCION_PENDIENTE: 'Primero confirma la recepción del paquete.',
    PEDIDO_ANULADO: 'El pedido fue anulado por Ventas y Postventa.',
    MAXIMO_INTENTOS_ALCANZADO: `Se alcanzó el máximo vigente: ${detalle.numeroIntentos} de ${detalle.maximoIntentos} intentos consumidos.`,
    RECEPCION_YA_CONFIRMADA: 'La recepción ya fue confirmada.', ESTADO_NO_FALLIDO: 'El despacho ya no está fallido.',
  };
  const acciones: { id: AccionIncidencia; titulo: string }[] = [
    { id: 'confirmarRecepcion', titulo: 'Confirmar recepción' }, { id: 'reprogramar', titulo: 'Reprogramar' },
    { id: 'cerrarComoDevueltoAOrigen', titulo: 'Cerrar como devuelto a origen' },
  ];
  const principal = detalle.incidencia.recepcion.estado === 'PENDIENTE_RETORNO' ? 'confirmarRecepcion'
    : detalle.acciones.reprogramar.habilitada ? 'reprogramar' : 'cerrarComoDevueltoAOrigen';
  return <Card component="section" aria-labelledby="titulo-decision" className={clases.decision}>
    <Stack gap="md"><Title order={2} id="titulo-decision" size="h4" className={clases.tituloSeccion}>Decisión</Title>
      <Text size="sm" c="dimmed">{detalle.incidencia.recepcion.estado === 'PENDIENTE_RETORNO'
        ? 'Confirma el retorno físico antes de resolver esta incidencia.' : 'Revisa la evidencia y el historial antes de decidir.'}</Text>
      {bloqueada && <Text size="sm" role="status">Actualiza el detalle antes de tomar una decisión.</Text>}
      {acciones.filter(({ id }) => id !== 'confirmarRecepcion' || detalle.incidencia.recepcion.estado === 'PENDIENTE_RETORNO').map(({ id, titulo }) => {
        const accion = detalle.acciones[id];
        const razones = accion.motivosBloqueo.map((codigo) => mensajes[codigo]);
        if (accion.habilitada && !destinos[id]) razones.push('Esta acción aún no está disponible.');
        if (bloqueada) razones.push('Es necesario obtener información actual.');
        const idAyuda = `ayuda-${id}`;
        return <Stack gap="xs" key={id}>
          <Button type="button" fullWidth variant={principal === id ? 'filled' : 'outline'} color={id === 'cerrarComoDevueltoAOrigen' ? 'red' : 'orange'}
            leftSection={id === 'confirmarRecepcion' ? <IconPackageImport size={20} aria-hidden="true" /> : id === 'reprogramar'
              ? <IconCalendarRepeat size={20} aria-hidden="true" /> : <IconArrowBackUp size={20} aria-hidden="true" />}
            disabled={bloqueada || !accion.habilitada || !destinos[id]} aria-describedby={razones.length ? idAyuda : undefined}
            onClick={() => destinos[id]?.({ idDespacho: detalle.idDespacho, idIncidencia: detalle.incidencia.idIncidencia,
              versionDespacho: detalle.versionDespacho, alCompletar })}>{titulo}</Button>
          {razones.length > 0 && <Stack id={idAyuda} gap="xs">{razones.map((razon) => <Text key={razon} size="sm" c="dimmed">{razon}</Text>)}</Stack>}
        </Stack>;
      })}
    </Stack>
  </Card>;
}
