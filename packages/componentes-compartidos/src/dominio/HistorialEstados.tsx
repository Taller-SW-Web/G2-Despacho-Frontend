import { useId } from 'react';
import { Card, Group, Skeleton, Stack, Text, Timeline, Title } from '@mantine/core';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { BadgeEstado } from './BadgeEstado';
import { EstadoVista } from '../feedback/EstadoVista';
import type { EstadoConsulta } from '../tipos-ui';
import clases from './HistorialEstados.module.css';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Modelo de presentación; el adaptador del consumidor transforma el DTO real. */
export type EntradaHistorialEstados = {
  id: string;
  fechaServidor: string;
  descripcionEvento: string;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  ejecutor?: string | null;
  observacion?: string | null;
  detalles?: readonly { etiqueta: string; valor: string }[];
};

export type PropiedadesHistorialEstados = {
  entradas: readonly EntradaHistorialEstados[];
  estado: EstadoConsulta;
  orden?: 'ascendente' | 'descendente';
  titulo?: string;
  alReintentar?: () => void;
};

function obtenerInstante(fecha: string): number {
  // No interpretar una fecha sin zona como un instante local de auditoría.
  return typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(fecha)
    ? Date.parse(fecha)
    : NaN;
}

function EstadosEvento({ entrada }: { entrada: EntradaHistorialEstados }) {
  const anterior = entrada.estadoAnterior?.trim();
  const nuevo = entrada.estadoNuevo?.trim();
  if (!anterior && !nuevo) return null;
  if (anterior && nuevo && anterior !== nuevo) return <Group gap="md" align="flex-start" wrap="wrap">
    <Stack gap="xs"><Text size="sm">Estado anterior</Text><BadgeEstado contexto="despacho" valor={anterior} /></Stack>
    <Stack gap="xs"><Text size="sm">Estado nuevo</Text><BadgeEstado contexto="despacho" valor={nuevo} /></Stack>
  </Group>;
  return <Stack gap="xs" align="flex-start">
    <Text size="sm">{nuevo ? 'Estado registrado' : 'Estado anterior'}</Text>
    <BadgeEstado contexto="despacho" valor={nuevo || anterior} />
  </Stack>;
}

/** CR-19: solo presenta eventos y tiempos confirmados por el servidor. */
export function HistorialEstados({ entradas, estado, orden = 'ascendente', titulo = 'Historial de estados', alReintentar }: PropiedadesHistorialEstados) {
  const idTitulo = useId();
  const direccion = orden === 'ascendente' ? 1 : -1;
  const ordenadas = entradas.map((entrada, indice) => ({ entrada, indice, instante: obtenerInstante(entrada.fechaServidor) }))
    .sort((a, b) => {
      const validaA = Number.isFinite(a.instante);
      const validaB = Number.isFinite(b.instante);
      if (!validaA || !validaB) return validaA ? -1 : validaB ? 1 : a.indice - b.indice;
      return direccion * (a.instante - b.instante) || a.indice - b.indice;
    });
  const esqueleto = <Stack gap="lg">{[0, 1, 2].map((indice) => <Skeleton key={indice} height={64} radius="md" />)}</Stack>;
  const mensajes = {
    vacio: { titulo: 'Todavía no hay eventos registrados', descripcion: 'El historial mostrará los eventos confirmados por el servidor.' },
    sinResultados: { titulo: 'No hay eventos que coincidan con la consulta', descripcion: 'Revisa los criterios de consulta del historial.' },
    error: { titulo: 'No pudimos cargar el historial', descripcion: 'Inténtalo nuevamente.' },
    sinPermiso: { titulo: 'No tienes permisos para ver este historial', descripcion: 'Solicita acceso a la persona responsable.' },
    noEncontrado: { titulo: 'No encontramos el historial', descripcion: 'Vuelve al detalle del despacho para continuar.' },
  };
  const mensaje = estado === 'datos' || estado === 'carga' ? undefined : mensajes[estado];
  const estadoVista = estado === 'datos' && entradas.length === 0 ? 'vacio' : estado;
  const texto = estadoVista === 'vacio' ? mensajes.vacio : mensaje;

  return <Card component="section" aria-labelledby={idTitulo} className={clases.raiz}>
    <Stack gap="lg">
      <Title order={3} id={idTitulo} className={clases.titulo}>{titulo}</Title>
      <EstadoVista
        estado={estadoVista}
        esqueleto={esqueleto}
        compacto
        titulo={texto?.titulo}
        descripcion={texto?.descripcion}
        accion={estado === 'error' && alReintentar ? { id: 'reintentar-historial', etiqueta: 'Reintentar' } : undefined}
        alAccionar={() => alReintentar?.()}
      >
        <Stack gap="lg">
          <Text size="sm" c="gray.7">Hora de Lima</Text>
          <Timeline role="list" aria-label={titulo} bulletSize={20} lineWidth={2} classNames={{ itemBody: clases.cuerpoEvento }}>
            {ordenadas.map(({ entrada, instante }) => <Timeline.Item key={entrada.id} role="listitem" title={<Text component="h4" m={0} fw={600}>{entrada.descripcionEvento}</Text>}>
              <Stack gap="sm" mt="sm">
                {Number.isFinite(instante)
                  ? <Text component="time" dateTime={entrada.fechaServidor} className={clases.fecha} size="sm">{dayjs(instante).tz('America/Lima').locale('es').format('DD/MM/YYYY HH:mm')}</Text>
                  : <Text size="sm" c="gray.7">Fecha no disponible</Text>}
                <EstadosEvento entrada={entrada} />
                {entrada.ejecutor?.trim() && <Text size="sm">Registrado por: {entrada.ejecutor}</Text>}
                {entrada.detalles?.length ? <dl className={clases.detalles}>
                  {entrada.detalles.map(({ etiqueta, valor }) => <div key={etiqueta}>
                    <Text component="dt" size="sm" c="dimmed">{etiqueta}</Text>
                    <Text component="dd" size="sm" m={0}>{valor}</Text>
                  </div>)}
                </dl> : null}
                {entrada.observacion?.trim() && <Text className={clases.observacion}>{entrada.observacion}</Text>}
              </Stack>
            </Timeline.Item>)}
          </Timeline>
        </Stack>
      </EstadoVista>
    </Stack>
  </Card>;
}
