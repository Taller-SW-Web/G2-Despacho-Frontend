import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Anchor, Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconCamera, IconExternalLink, IconMapPin, IconPackage, IconPhone, IconTruck, IconUserCheck, IconX } from '@tabler/icons-react';
import { BadgeEstado, notificarOperacion } from '@despacho/componentes-compartidos';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useOperacion } from '../api/ContextoOperacion';
import { aErrorOperacion } from '../api/errores';
import type { DetalleDespacho } from '../api/tipos';
import { CargandoTarjetas, ErrorConsulta, Pantalla } from '../componentes/Pantalla';
import { useConsulta } from '../componentes/useConsulta';
import { claveDeIntencion, liberarClave } from '../utilidades/claves';
import { etiquetaIntento, formatearFecha, formatearHora } from '../utilidades/formato';
import { complementoResultado } from './PaginaRuta';

export type EstadoNavegacionDetalle = { totalRuta?: number };

export function Seccion({ icono, titulo, children }: { icono: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <Card>
      <Stack gap="sm">
        <Group gap="xs" c="var(--ia-color-text-secondary)">{icono}<Text fw={600} size="md">{titulo}</Text></Group>
        {children}
      </Stack>
    </Card>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <Stack gap={0}><Text size="sm" c="var(--ia-color-text-secondary)">{etiqueta}</Text><Text fw={700} className="ia-num">{valor}</Text></Stack>;
}

/** Hito visible del estado actual, siguiendo el ciclo asignado → en camino → entregado o fallido. */
function hitoActual(detalle: DetalleDespacho): { etiqueta: string; valor: string } {
  const h = detalle.hitos;
  const pares: Record<string, [string, string | null | undefined]> = {
    ASIGNADO: ['Asignado a las', h?.asignadoEn],
    EN_CAMINO: ['En camino desde', h?.enCaminoEn],
    ENTREGADO: ['Entregado a las', h?.entregadoEn],
    FALLIDO: ['Registrado a las', h?.fallidoEn],
  };
  const [etiqueta, instante] = pares[detalle.estado] ?? ['Actualizado', null];
  return { etiqueta, valor: formatearHora(instante) ?? '—' };
}

/** 03 · Detalle asignado y 04 · Detalle en camino. Abrir no cambia el estado; solo los botones lo hacen. */
export function PaginaDetalle() {
  const { id = '' } = useParams();
  const operacion = useOperacion();
  const navigate = useNavigate();
  const totalRuta = (useLocation().state as EstadoNavegacionDetalle | null)?.totalRuta;
  const cargar = useCallback((signal: AbortSignal) => operacion.consultarDetalle(id, signal), [operacion, id]);
  const { consulta, recargar } = useConsulta(cargar);
  const [actualizado, setActualizado] = useState<DetalleDespacho | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detalle = actualizado ?? (consulta.estado === 'lista' ? consulta.datos : null);

  async function iniciarTraslado() {
    const alcance = `inicio:${id}`;
    setProcesando(true);
    setError(null);
    try {
      const resultado = await operacion.iniciarTraslado(id, claveDeIntencion(alcance));
      liberarClave(alcance);
      setActualizado(resultado);
      notificarOperacion({ id: `inicio-${id}`, tipo: 'exito', mensaje: `${resultado.codigoRastreoInterno} va en camino.` });
    } catch (fallo) {
      const traducido = aErrorOperacion(fallo);
      if (!traducido.reintentable) liberarClave(alcance);
      if (traducido.tipo === 'conflicto') {
        notificarOperacion({ id: `conflicto-${id}`, tipo: 'informacion', mensaje: traducido.message });
        setActualizado(null);
        recargar();
      } else setError(traducido.message);
    } finally { setProcesando(false); }
  }

  const acciones = detalle?.estado === 'ASIGNADO' ? (
    <Button fullWidth size="lg" leftSection={<IconTruck size={20} />} loading={procesando} onClick={iniciarTraslado}>
      Iniciar traslado
    </Button>
  ) : detalle?.estado === 'EN_CAMINO' ? (
    <Stack gap="sm">
      <Button fullWidth size="lg" leftSection={<IconCamera size={20} />} onClick={() => navigate(`/repartidor/despachos/${id}/entrega`)}>
        Confirmar entrega
      </Button>
      <Button fullWidth size="lg" variant="outline" color="red" leftSection={<IconX size={20} />}
        onClick={() => navigate(`/repartidor/despachos/${id}/fallo`)}>
        Marcar como fallido
      </Button>
    </Stack>
  ) : undefined;

  return (
    <Pantalla
      titulo={detalle?.codigoRastreoInterno ?? 'Despacho'}
      alVolver={() => navigate('/repartidor/ruta')}
      accionEncabezado={detalle && <BadgeEstado contexto="despacho" valor={detalle.estado} size="sm" />}
      acciones={acciones}
    >
      {!detalle && consulta.estado === 'cargando' && <CargandoTarjetas />}
      {!detalle && consulta.estado === 'error' && <ErrorConsulta error={consulta.error} alReintentar={recargar} />}
      {detalle && (
        <Stack gap="md">
          {error && <Alert color="red" icon={<IconAlertCircle size={18} />} title="No se registró el cambio" role="alert">{error}</Alert>}
          {detalle.destino && (
            <Seccion icono={<IconMapPin size={20} />} titulo="Destino">
              <Text fw={700} size="lg">{detalle.destino.direccion}, {detalle.destino.distrito}</Text>
              {detalle.destino.referencia && <Text c="var(--ia-color-text-secondary)">Ref.: {detalle.destino.referencia}</Text>}
              <Button component="a" variant="outline" size="lg" fullWidth target="_blank" rel="noopener noreferrer"
                leftSection={<IconExternalLink size={20} />}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${detalle.destino.direccion}, ${detalle.destino.distrito}, Lima, Perú`)}`}>
                Abrir en mapas
              </Button>
            </Seccion>
          )}
          {detalle.destinatario && (
            <Seccion icono={<IconUserCheck size={20} />} titulo="Destinatario">
              <Group justify="space-between" wrap="nowrap" align="center">
                <Stack gap={2} style={{ minWidth: 0 }}>
                  <Text fw={700} size="lg">{detalle.destinatario.nombre}</Text>
                  <Text c="var(--ia-color-text-secondary)" className="ia-num">{detalle.destinatario.telefono}</Text>
                </Stack>
                <Button component="a" href={`tel:${detalle.destinatario.telefono.replace(/[^\d+]/g, '')}`} variant="light" color="gray"
                  size="lg" leftSection={<IconPhone size={20} color="var(--ia-color-action-primary-hover)" />}>
                  Llamar
                </Button>
              </Group>
            </Seccion>
          )}
          {!detalle.destino && (
            <Alert color="gray" title={complementoResultado(detalle) ?? 'Despacho resuelto'}>
              Los datos del destinatario ya no se muestran para un despacho resuelto.
            </Alert>
          )}
          <Seccion icono={<IconPackage size={20} />} titulo="Despacho">
            <SimpleGrid cols={2} spacing="md" verticalSpacing="sm">
              <Dato etiqueta="Posición en ruta" valor={`${detalle.secuenciaRuta ?? '—'}${totalRuta ? ` de ${totalRuta}` : ''}`} />
              <Dato etiqueta="Intento" valor={etiquetaIntento(detalle.numeroIntentos, detalle.maximoIntentos, detalle.estado).replace('Intento ', '')} />
              <Dato etiqueta="Fecha programada" valor={formatearFecha(detalle.fechaProgramada)} />
              <Dato {...hitoActual(detalle)} />
            </SimpleGrid>
          </Seccion>
          {detalle.estado === 'EN_CAMINO' && (
            <Alert color="blue" icon={<IconCamera size={18} />}>Para cerrar la entrega necesitas una foto del paquete.</Alert>
          )}
          {detalle.estado === 'ASIGNADO' && (
            <Text size="sm" c="var(--ia-color-text-secondary)">Pulsa «Iniciar traslado» cuando recojas el paquete y salgas del centro.</Text>
          )}
          {!detalle.destino && <Anchor component="button" type="button" onClick={() => navigate('/repartidor/ruta')}>Volver a mi ruta</Anchor>}
        </Stack>
      )}
    </Pantalla>
  );
}
