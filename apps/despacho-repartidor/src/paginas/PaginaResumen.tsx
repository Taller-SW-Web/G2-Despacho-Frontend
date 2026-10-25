import { useCallback, type ReactNode } from 'react';
import { Badge, Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconArrowBackUp, IconCircleCheck, IconClock, IconLogout, IconPackage } from '@tabler/icons-react';
import { EstadoVista } from '@despacho/componentes-compartidos';
import { useOperacion } from '../api/ContextoOperacion';
import { esNoIntentado } from '../api/tipos';
import { CargandoTarjetas, ErrorConsulta, Pantalla } from '../componentes/Pantalla';
import { useConsulta } from '../componentes/useConsulta';
import { useSesion } from '../sesion/SesionProveedor';
import { formatearHora } from '../utilidades/formato';
import clases from './PaginaResumen.module.css';

function Indicador({ icono, etiqueta, valor }: { icono: ReactNode; etiqueta: string; valor: number }) {
  return (
    <Card>
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap">{icono}<Text size="sm">{etiqueta}</Text></Group>
        <Text className={`ia-num ${clases.cifra}`}>{valor}</Text>
      </Stack>
    </Card>
  );
}

/** 11 · Resumen de jornada. Contrato ampliado: hora de cierre y paquetes a devolver al centro. */
export function PaginaResumen() {
  const operacion = useOperacion();
  const { cerrar } = useSesion();
  const cargar = useCallback((signal: AbortSignal) => operacion.consultarResumen(signal), [operacion]);
  const { consulta, recargar } = useConsulta(cargar);
  const resumen = consulta.estado === 'lista' ? consulta.datos : null;
  const cerrada = resumen?.estadoJornada === 'CERRADA';

  return (
    <Pantalla titulo="Resumen de jornada" seccion="resumen" estadoOperativo={resumen ? (cerrada || !resumen.idJornada ? 'FUERA_DE_TURNO' : null) : null}>
      {consulta.estado === 'cargando' && <CargandoTarjetas cantidad={3} />}
      {consulta.estado === 'error' && <ErrorConsulta error={consulta.error} alReintentar={recargar} />}
      {resumen && !resumen.idJornada && (
        <EstadoVista estado="vacio" titulo="Sin actividad hoy" descripcion="No hay una jornada registrada para hoy." />
      )}
      {resumen?.idJornada && (
        <Stack gap="md">
          <Card bg="var(--ia-color-surface-cloud-subtle)" withBorder={false}>
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text fw={600}>Despachos asignados</Text>
                <Text className={`ia-num ${clases.cifra}`}>{resumen.asignados}</Text>
              </Stack>
              {cerrada && (
                <Group gap={4} c="var(--ia-color-text-secondary)">
                  <IconClock size={18} aria-hidden="true" />
                  <Text size="sm">Cerrada {formatearHora(resumen.cerradaEn) ?? ''}</Text>
                </Group>
              )}
            </Group>
          </Card>
          <SimpleGrid cols={2} spacing="md">
            <Indicador icono={<IconCircleCheck size={20} color="var(--ia-color-success-default)" />} etiqueta="Entregados" valor={resumen.entregados} />
            <Indicador icono={<IconAlertTriangle size={20} color="var(--ia-color-error-default)" />} etiqueta="Fallidos con intento" valor={resumen.fallidosConIntento} />
            <Indicador icono={<IconArrowBackUp size={20} color="var(--ia-color-warning-default)" />} etiqueta="No intentados" valor={resumen.noIntentados} />
            <Indicador icono={<IconClock size={20} />} etiqueta="Pendientes" valor={resumen.pendientes} />
          </SimpleGrid>
          {resumen.paquetesPorDevolver.length > 0 && (
            <Stack gap="sm">
              <Text fw={700} c="var(--ia-color-text-secondary)">Paquetes a devolver al centro</Text>
              {resumen.paquetesPorDevolver.map((paquete) => (
                <Card key={paquete.idDespacho} padding="sm">
                  <Group wrap="nowrap" gap="md">
                    <IconPackage size={24} aria-hidden="true" />
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" c="var(--ia-color-text-secondary)">{paquete.codigoRastreoInterno}</Text>
                      <Text fw={700}>{paquete.direccion ?? 'Dirección no disponible'}{paquete.distrito ? `, ${paquete.distrito}` : ''}</Text>
                    </Stack>
                    <Badge color="gray" variant="light" tt="none">{esNoIntentado('FALLIDO', paquete.motivoFallo) ? 'No intentado' : 'No entregado'}</Badge>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      )}
      {consulta.estado !== 'cargando' && (
        <Button variant="subtle" color="gray" leftSection={<IconLogout size={18} />} onClick={() => cerrar('manual')} mt="lg">
          Cerrar sesión
        </Button>
      )}
    </Pantalla>
  );
}
