import { useCallback, useEffect, type ReactNode } from 'react';
import { Badge, Button, Group, Loader, Modal, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { BadgeEstado, EstadoVista, TablaDatos } from '@despacho/componentes-compartidos';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { consultarDetalle } from './api';
import { useConsultaJornadas } from './useConsultaJornadas';
import { MetricasJornada } from './MetricasJornada';
import modales from '../flota/ModalesFlota.module.css';
import clases from './Monitoreo.module.css';

const estadosJornada: Record<string, { etiqueta: string; color: string }> = {
  ACTIVA: { etiqueta: 'Activa', color: 'green' },
  CERRADA: { etiqueta: 'Cerrada', color: 'gray' },
};
const cantidad = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 4 });
// §5.5: fechas dd/mm/aaaa y horas de 24 h, en la zona horaria de Operación.
const fechaHora = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="sm" fw={600} className={clases.etiquetaDato}>
        {etiqueta}
      </Text>
      <div>{children}</div>
    </Stack>
  );
}

export function DetalleJornada({
  cliente,
  id,
  nombreZona = (idZona) => idZona,
  alCerrar,
  alDenegar,
}: {
  cliente: ClienteApi;
  id: string;
  nombreZona?: (idZona: string) => string;
  alCerrar: () => void;
  alDenegar: () => void;
}) {
  const cargar = useCallback(
    (signal: AbortSignal) => consultarDetalle(cliente, id, signal),
    [cliente, id],
  );
  const consulta = useConsultaJornadas(cargar);
  useEffect(() => {
    if (consulta.denegado) alDenegar();
  }, [consulta.denegado, alDenegar]);
  const jornada = consulta.datos;
  if (consulta.denegado)
    return <EstadoVista estado="sinPermiso" alAccionar={consulta.reintentarAcceso} />;
  const estado = jornada ? estadosJornada[jornada.estado] : undefined;
  return (
    <Modal
      opened
      title="Detalle de jornada"
      classNames={{ title: modales.titulo }}
      size={880}
      radius="lg"
      onClose={alCerrar}
      centered
    >
      <Stack gap="lg">
        <EstadoVista
          estado={!jornada && consulta.cargando ? 'carga' : consulta.error ? 'error' : 'datos'}
          esqueleto={
            <Group justify="center" p="lg">
              <Loader aria-label="Cargando jornada" />
            </Group>
          }
          accion={{ id: 'actualizar', etiqueta: 'Reintentar detalle' }}
          alAccionar={consulta.actualizar}
        >
          {jornada && (
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                <Dato etiqueta="Furgoneta">
                  <Text fw={600} className={clases.placa}>
                    {jornada.placa}
                  </Text>
                </Dato>
                <Dato etiqueta="Fecha">
                  <Text className={clases.placa}>
                    {jornada.fecha.split('-').reverse().join('/')}
                  </Text>
                </Dato>
                <Dato etiqueta="Estado">
                  <Badge color={estado?.color ?? 'gray'} size="md" tt="none">
                    {estado?.etiqueta ?? 'Estado no disponible'}
                  </Badge>
                </Dato>
                <Dato etiqueta="Zona">
                  <Text className={clases.zona}>{nombreZona(jornada.idZona)}</Text>
                </Dato>
              </SimpleGrid>
              <Stack gap="sm">
                <Title order={3} className={modales.seccion}>
                  Ocupación confirmada
                </Title>
                <MetricasJornada jornada={jornada} />
                <Text size="sm" className={clases.actualizacion}>
                  Remanente: {cantidad.format(jornada.capacidadRemanente.pesoKg)} kg ·{' '}
                  {cantidad.format(jornada.capacidadRemanente.volumenM3)} m³ ·{' '}
                  {cantidad.format(jornada.capacidadRemanente.paquetes)} paquetes
                </Text>
                {jornada.cerradaEn && (
                  <Text size="sm" className={clases.actualizacion}>
                    Cierre: {fechaHora.format(new Date(jornada.cerradaEn))}
                  </Text>
                )}
              </Stack>
              <Stack gap="sm">
                <Title order={3} className={modales.seccion}>
                  Despachos de la jornada
                </Title>
                <div className={clases.tabla}>
                  <TablaDatos
                    filas={jornada.despachos}
                    obtenerId={(fila) => fila.idDespacho}
                    tituloAccesible="Despachos proyectados de la jornada"
                    estado={jornada.despachos.length ? 'datos' : 'vacio'}
                    anchoMinimo={550}
                    renderizarEstado={() => (
                      <EstadoVista
                        estado="vacio"
                        compacto
                        titulo="Sin despachos en esta jornada"
                        descripcion="Los despachos asignados aparecerán aquí."
                      />
                    )}
                    columnas={[
                      {
                        id: 'secuencia',
                        encabezado: 'Orden',
                        alineacion: 'right',
                        celda: (fila) => fila.secuenciaRuta ?? 'Sin orden',
                      },
                      {
                        id: 'id',
                        encabezado: 'Despacho',
                        celda: (fila) => <span className={clases.placa}>{fila.idDespacho}</span>,
                      },
                      {
                        id: 'estado',
                        encabezado: 'Estado',
                        celda: (fila) => <BadgeEstado contexto="despacho" valor={fila.estado} />,
                      },
                    ]}
                  />
                </div>
              </Stack>
            </Stack>
          )}
        </EstadoVista>
        <Group justify="flex-end">
          <Button type="button" variant="outline" mih={44} onClick={alCerrar}>
            Volver al monitoreo
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
