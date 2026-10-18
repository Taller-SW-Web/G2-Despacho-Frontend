import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Group, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import {
  BadgeEstado, CapturaEvidencia, EstadoVista, FranjaEstado, TarjetaDespacho, TarjetaKpi,
} from '@despacho/componentes-compartidos';
import { useNavigate, useParams } from 'react-router-dom';
import { consultarDetalle, consultarResumen, consultarRuta, mensajeErrorConsulta } from './api';
import type { DetalleDespacho, ResumenJornada, RutaRepartidor } from './api';

type Consulta<T> =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'lista'; datos: T };

const despachoDemoId = '00000000-0000-4000-8000-000000000017';
const rutaDemo: RutaRepartidor = {
  idJornada: '00000000-0000-4000-8000-000000000016',
  fecha: new Date().toISOString().slice(0, 10),
  estadoOperativo: 'EN_RUTA',
  despachos: [{
    idDespacho: despachoDemoId,
    codigoRastreoInterno: 'DEMO-CR17-001',
    estado: 'ASIGNADO',
    secuenciaRuta: 1,
    fechaProgramada: null,
    numeroIntentos: 0,
    maximoIntentos: 2,
    destinatario: 'Destinatario de demostración',
    direccion: 'Av. Ejemplo 123',
    distrito: 'Distrito de prueba',
  }],
};
const detalleDemo: DetalleDespacho = {
  idJornada: '00000000-0000-4000-8000-000000000016',
  idDespacho: despachoDemoId,
  codigoRastreoInterno: 'DEMO-CR17-001',
  estado: 'ASIGNADO',
  secuenciaRuta: 1,
  fechaProgramada: null,
  numeroIntentos: 0,
  maximoIntentos: 2,
  destinatario: { nombre: 'Destinatario de demostración', telefono: '000000000' },
  destino: {
    direccion: 'Av. Ejemplo 123',
    referencia: 'Dirección ficticia para demostración',
    departamento: null,
    provincia: null,
    distrito: 'Distrito de prueba',
    codigoPostal: null,
  },
};
const resumenDemo: ResumenJornada = {
  idJornada: '00000000-0000-4000-8000-000000000016',
  fecha: rutaDemo.fecha,
  asignados: 1,
  entregados: 0,
  fallidosConIntento: 0,
  noIntentados: 0,
  pendientes: 1,
};

function useConsulta<T>(cargar: (signal: AbortSignal) => Promise<T>, clave: string) {
  const [revision, setRevision] = useState(0);
  const [consulta, setConsulta] = useState<Consulta<T>>({ estado: 'cargando' });

  useEffect(() => {
    const controlador = new AbortController();
    setConsulta({ estado: 'cargando' });
    Promise.resolve().then(() => cargar(controlador.signal)).then(
      (datos) => setConsulta({ estado: 'lista', datos }),
      (error: unknown) => {
        if (!controlador.signal.aborted) setConsulta({ estado: 'error', mensaje: mensajeErrorConsulta(error) });
      },
    );
    return () => controlador.abort();
  }, [cargar, clave, revision]);

  return { consulta, reintentar: () => setRevision((actual) => actual + 1) };
}

/** CR-08: carga y error con la recuperación común de ambas aplicaciones. */
function EstadoConsulta<T>({ consulta, reintentar }: { consulta: Consulta<T>; reintentar: () => void }) {
  if (consulta.estado === 'cargando') {
    return <EstadoVista estado="carga" esqueleto={<Stack gap="md">{[0, 1, 2].map((fila) => <Skeleton key={fila} height={112} radius="md" />)}</Stack>} />;
  }
  if (consulta.estado === 'error') {
    return <EstadoVista estado="error" titulo="No se pudo cargar" descripcion={consulta.mensaje}
      accion={{ id: 'reintentar', etiqueta: 'Reintentar' }} alAccionar={reintentar} />;
  }
  return null;
}

function etiquetaIntento(numero: number, maximo: number | null) {
  return maximo === null ? `${numero} intentos` : `${numero} de ${maximo} intentos`;
}

export function PaginaRuta() {
  const navigate = useNavigate();
  const modoDemostracion = import.meta.env.DEV;
  const cargar = useCallback(
    (signal: AbortSignal) => modoDemostracion ? Promise.resolve(rutaDemo) : consultarRuta(signal),
    [modoDemostracion],
  );
  const { consulta, reintentar } = useConsulta(cargar, 'ruta');

  if (consulta.estado === 'error') {
    return <EstadoConsulta consulta={consulta} reintentar={reintentar} />;
  }
  if (consulta.estado === 'cargando') return <EstadoConsulta consulta={consulta} reintentar={reintentar} />;
  const { datos } = consulta;
  if (!datos.idJornada) {
    return <FranjaEstado tipo="fueraDeTurno" mensaje="No tienes una jornada activa para hoy." />;
  }
  if (datos.despachos.length === 0) {
    return <EstadoVista estado="vacio" titulo="Ruta vacía" descripcion="Todavía no tienes despachos asignados a esta jornada." />;
  }

  return (
    <Stack gap="md">
      <Group gap="xs"><Text c="dimmed">Jornada del {datos.fecha}</Text><BadgeEstado contexto="operacionRepartidor" valor={datos.estadoOperativo} size="sm" /></Group>
      {datos.despachos.map((despacho, indice) => (
        <TarjetaDespacho
          key={despacho.idDespacho}
          idDespacho={despacho.idDespacho}
          codigo={despacho.codigoRastreoInterno}
          posicion={despacho.secuenciaRuta ?? indice + 1}
          direccion={despacho.direccion && despacho.distrito
            ? `${despacho.direccion}, ${despacho.distrito}` : 'Dirección no disponible'}
          destinatario={despacho.destinatario ?? 'Destinatario no disponible'}
          estado={despacho.estado}
          etiquetaIntento={etiquetaIntento(despacho.numeroIntentos, despacho.maximoIntentos)}
          variante={despacho.estado === 'ENTREGADO' || despacho.estado === 'NO_INTENTADO' ? 'resuelto' : undefined}
          alAbrir={(id) => navigate(`/repartidor/despachos/${encodeURIComponent(id)}`)}
        />
      ))}
    </Stack>
  );
}

export function PaginaResumen() {
  const modoDemostracion = import.meta.env.DEV;
  const cargar = useCallback(
    (signal: AbortSignal) => modoDemostracion ? Promise.resolve(resumenDemo) : consultarResumen(signal),
    [modoDemostracion],
  );
  const { consulta, reintentar } = useConsulta(cargar, 'resumen');
  if (consulta.estado !== 'lista') return <EstadoConsulta consulta={consulta} reintentar={reintentar} />;
  const resumen: ResumenJornada = consulta.datos;

  return (
    <Stack gap="md">
      <Text c="dimmed">Resumen del {resumen.fecha}</Text>
      {!resumen.idJornada && <EstadoVista estado="vacio" compacto titulo="Sin actividad en la jornada"
        descripcion="No hay actividad registrada para la jornada de hoy." />}
      <SimpleGrid cols={2} spacing="md">
        <TarjetaKpi id="asignados" etiqueta="Asignados" valor={resumen.asignados} />
        <TarjetaKpi id="entregados" etiqueta="Entregados" valor={resumen.entregados} tono="success" />
        <TarjetaKpi id="fallidos" etiqueta="Fallidos con intento" valor={resumen.fallidosConIntento} tono="error" />
        <TarjetaKpi id="no-intentados" etiqueta="No intentados" valor={resumen.noIntentados} />
        <TarjetaKpi id="pendientes" etiqueta="Pendientes" valor={resumen.pendientes} tono="info" />
      </SimpleGrid>
    </Stack>
  );
}

export function PaginaDetalle() {
  const { id } = useParams();
  const modoDemostracion = import.meta.env.DEV;
  const cargar = useCallback((signal: AbortSignal) => {
    if (!id) throw new Error('Falta el identificador del despacho.');
    if (modoDemostracion && id === despachoDemoId) return Promise.resolve(detalleDemo);
    return consultarDetalle(id, signal);
  }, [id, modoDemostracion]);
  const { consulta, reintentar } = useConsulta(cargar, id ?? '');
  if (consulta.estado !== 'lista') return <EstadoConsulta consulta={consulta} reintentar={reintentar} />;
  const detalle: DetalleDespacho = consulta.datos;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>{detalle.codigoRastreoInterno}</Title>
        <BadgeEstado contexto="despacho" valor={detalle.estado} />
      </Group>
      <Card withBorder>
        <Stack gap="xs">
          {detalle.destinatario && detalle.destino ? (
            <>
              <Text fw={600}>Destinatario</Text>
              <Text>{detalle.destinatario.nombre}</Text>
              <Text component="a" href={`tel:${encodeURIComponent(detalle.destinatario.telefono)}`}>
                {detalle.destinatario.telefono}
              </Text>
              <Text fw={600} mt="sm">Dirección</Text>
              <Text>{detalle.destino.direccion}</Text>
              {detalle.destino.referencia && <Text>Referencia: {detalle.destino.referencia}</Text>}
              <Text>{detalle.destino.distrito}</Text>
            </>
          ) : <Text c="dimmed">Los datos personales no están disponibles para este estado.</Text>}
          <Text size="sm" c="dimmed">{etiquetaIntento(detalle.numeroIntentos, detalle.maximoIntentos)}</Text>
        </Stack>
      </Card>
      <Alert color="yellow" title="Registro de entrega y evidencia">
        Las acciones de entrega, fallo y carga de evidencia se habilitarán cuando el flujo transaccional de F-03 esté integrado.
      </Alert>
      <CapturaEvidencia
        archivo={null}
        descripcionFoto="Evidencia fotográfica del despacho"
        fase="vacia"
        politicaArchivo={null}
        disabled
        alSeleccionar={() => undefined}
        alVolverATomar={() => undefined}
        alReintentar={() => undefined}
      />
    </Stack>
  );
}
