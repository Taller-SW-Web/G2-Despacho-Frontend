import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Anchor, Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconCamera, IconExternalLink, IconMapPin, IconPackage, IconPhone, IconTruck, IconUserCheck, IconX } from '@tabler/icons-react';
import { BadgeEstado, notificarOperacion } from '@despacho/componentes-compartidos';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useOperacion } from '../api/ContextoOperacion';
import { aErrorOperacion } from '../api/errores';
import type { DetalleDespacho } from '../api/tipos';
import { trabajoDe, type TipoTrabajo } from '../api/trabajo';
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
    RECOGIDO: ['Recogido a las', h?.recogidoEn],
    FALLIDO: ['Registrado a las', h?.fallidoEn],
  };
  const [etiqueta, instante] = pares[detalle.estado] ?? ['Actualizado', null];
  return { etiqueta, valor: formatearHora(instante) ?? '—' };
}

/** 03 · Detalle asignado y 04 · Detalle en camino. Abrir no cambia el estado; solo los botones lo hacen. */
export function PaginaDetalle({ tipo = 'ENTREGA' }: { tipo?: TipoTrabajo }) {
  const { id = '' } = useParams();
  const operacion = useOperacion();
  const navigate = useNavigate();
  const trabajo = trabajoDe(operacion, tipo);
  const esRecojo = tipo === 'RECOJO';
  const totalRuta = (useLocation().state as EstadoNavegacionDetalle | null)?.totalRuta;
  const cargar = useCallback((signal: AbortSignal) => trabajoDe(operacion, tipo).consultar(id, signal), [operacion, id, tipo]);
  const { consulta, recargar } = useConsulta(cargar);
  const [actualizado, setActualizado] = useState<DetalleDespacho | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detalle = actualizado ?? (consulta.estado === 'lista' ? consulta.datos : null);

  async function iniciarTraslado() {
    const alcance = `${esRecojo ? 'inicio-recojo' : 'inicio'}:${id}`;
    setProcesando(true);
    setError(null);
    try {
      const resultado = await trabajo.iniciar(id, claveDeIntencion(alcance));
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
      {esRecojo ? 'En camino' : 'Iniciar traslado'}
    </Button>
  ) : detalle?.estado === 'EN_CAMINO' ? (
    <Stack gap="sm">
      <Button fullWidth size="lg" leftSection={<IconCamera size={20} />} onClick={() => navigate(esRecojo ? `${trabajo.base}/${id}/recogido` : `${trabajo.base}/${id}/entrega`)}>
        {esRecojo ? 'Registrar recojo' : 'Confirmar entrega'}
      </Button>
      <Button fullWidth size="lg" variant="outline" color="red" leftSection={<IconX size={20} />}
        onClick={() => navigate(`${trabajo.base}/${id}/fallo`)}>
        {esRecojo ? 'No se pudo recoger' : 'Marcar como fallido'}
      </Button>
    </Stack>
  ) : undefined;

  return (
    <Pantalla
      titulo={detalle?.codigoRastreoInterno ?? (esRecojo ? 'Recojo' : 'Despacho')}
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
            <Seccion icono={<IconMapPin size={20} />} titulo={esRecojo ? 'Domicilio' : 'Destino'}>
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
            <Seccion icono={<IconUserCheck size={20} />} titulo={esRecojo ? 'Contacto' : 'Destinatario'}>
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
            <Alert color="gray" title={complementoResultado(detalle, tipo) ?? (esRecojo ? 'Recojo resuelto' : 'Despacho resuelto')}>
              {esRecojo ? 'Los datos del contacto ya no se muestran para un recojo resuelto.' : 'Los datos del destinatario ya no se muestran para un despacho resuelto.'}
            </Alert>
          )}
          {esRecojo && detalle.lineas && (
            <Seccion icono={<IconPackage size={20} />} titulo="Productos a recoger">
              <Stack gap={4}>
                {detalle.lineas.map((linea) => <Text key={linea.sku} fw={700}>{linea.cantidad} × {linea.sku}</Text>)}
              </Stack>
            </Seccion>
          )}
          <Seccion icono={<IconPackage size={20} />} titulo={esRecojo ? 'Recojo' : 'Despacho'}>
            <SimpleGrid cols={2} spacing="md" verticalSpacing="sm">
              <Dato etiqueta="Posición en ruta" valor={`${detalle.secuenciaRuta ?? '—'}${totalRuta ? ` de ${totalRuta}` : ''}`} />
              <Dato etiqueta="Intento" valor={etiquetaIntento(detalle.numeroIntentos, detalle.maximoIntentos, detalle.estado).replace('Intento ', '')} />
              <Dato etiqueta="Fecha programada" valor={formatearFecha(detalle.fechaProgramada)} />
              <Dato {...hitoActual(detalle)} />
            </SimpleGrid>
          </Seccion>
          {detalle.estado === 'EN_CAMINO' && (
            <Alert color="blue" icon={<IconCamera size={18} />}>{esRecojo ? 'Para registrar el recojo necesitas una foto del producto.' : 'Para cerrar la entrega necesitas una foto del paquete.'}</Alert>
          )}
          {detalle.estado === 'ASIGNADO' && (
            <Text size="sm" c="var(--ia-color-text-secondary)">{esRecojo ? 'Pulsa «En camino» cuando salgas hacia el domicilio.' : 'Pulsa «Iniciar traslado» cuando recojas el paquete y salgas del centro.'}</Text>
          )}
          {!detalle.destino && <Anchor component="button" type="button" onClick={() => navigate('/repartidor/ruta')}>Volver a mi ruta</Anchor>}
        </Stack>
      )}
    </Pantalla>
  );
}
