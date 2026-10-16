import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Container, MantineProvider, NativeSelect, Stack, Text, Title } from '@mantine/core';
import { HistorialEstados, tema } from '@despacho/componentes-compartidos';
import type { EntradaHistorialEstados, EstadoConsulta } from '@despacho/componentes-compartidos';
import '@mantine/core/styles.css';
import '@despacho/componentes-compartidos/tokens.css';

const recepcion: EntradaHistorialEstados = {
  id: 'recepcion-demo', fechaServidor: '2026-10-16T15:30:00Z', descripcionEvento: 'Recepción confirmada en el centro',
  estadoAnterior: 'FALLIDO', estadoNuevo: 'FALLIDO', ejecutor: 'Gestor de prueba',
  observacion: 'Se recibió físicamente el paquete con el sello intacto. El despacho permanece Fallido hasta que se tome una decisión.',
};
const entradas: EntradaHistorialEstados[] = [
  recepcion,
  { id: 'fallo-demo', fechaServidor: '2026-10-15T20:20:00Z', descripcionEvento: 'Entrega fallida registrada', estadoAnterior: 'EN_CAMINO', estadoNuevo: 'FALLIDO', ejecutor: 'Repartidor de prueba', observacion: 'El destinatario no se encontraba en el lugar.' },
  { id: 'asignacion-demo', fechaServidor: '2026-10-15T13:30:00Z', descripcionEvento: 'Despacho asignado a reparto', estadoAnterior: 'PENDIENTE_ASIGNACION', estadoNuevo: 'ASIGNADO' },
  { id: 'traslado-demo', fechaServidor: '2026-10-15T15:00:00Z', descripcionEvento: 'Traslado iniciado', estadoAnterior: 'ASIGNADO', estadoNuevo: 'EN_CAMINO', ejecutor: 'Repartidor de prueba' },
];

const casos: Record<string, readonly EntradaHistorialEstados[]> = {
  normal: entradas,
  recepcion: [recepcion],
  opcionales: [{ id: 'sin-opcionales', fechaServidor: '2026-10-16T15:30:00Z', descripcionEvento: 'Evento confirmado por el servidor' }],
  empates: [
    { id: 'primero', fechaServidor: '2026-10-16T15:30:00Z', descripcionEvento: 'Primer evento recibido en el empate' },
    { id: 'segundo', fechaServidor: '2026-10-16T10:30:00-05:00', descripcionEvento: 'Segundo evento recibido en el empate' },
  ],
  observaciones: [{ ...recepcion, observacion: 'Se verificó el embalaje y se confirmó la recepción física del paquete.\nLa observación completa permanece disponible para quien revisa la incidencia, incluso en una pantalla pequeña, sin recortar el texto ni sustituirlo por puntos suspensivos.\nEsta recepción no crea un estado nuevo del despacho ni reinicia sus intentos.' }],
  desconocido: [{ ...recepcion, estadoAnterior: undefined, estadoNuevo: 'ESTADO_DE_PRUEBA_DESCONOCIDO' }],
  fechaInvalida: [{ ...recepcion, fechaServidor: '' }],
};

function EjemploHistorialEstados() {
  const [estado, cambiarEstado] = useState<EstadoConsulta>('datos');
  const [orden, cambiarOrden] = useState<'ascendente' | 'descendente'>('ascendente');
  const [caso, cambiarCaso] = useState('normal');
  const temporizador = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  return <Container size="md" py="xl" component="main">
    <Stack gap="lg">
      <div>
        <Title order={1}>Revisar eventos del despacho</Title>
        <Text>Ejemplo de desarrollo con fechas y personas de prueba. No consulta ni modifica servicios.</Text>
      </div>
      <NativeSelect label="Estado de consulta" value={estado} onChange={(evento) => cambiarEstado(evento.currentTarget.value as EstadoConsulta)} data={[
        { value: 'datos', label: 'Datos disponibles' }, { value: 'carga', label: 'Cargando' },
        { value: 'vacio', label: 'Sin eventos' }, { value: 'sinResultados', label: 'Sin coincidencias' },
        { value: 'error', label: 'Error de consulta' }, { value: 'sinPermiso', label: 'Acceso denegado' },
        { value: 'noEncontrado', label: 'Historial no encontrado' },
      ]} />
      <NativeSelect label="Orden cronológico" value={orden} onChange={(evento) => cambiarOrden(evento.currentTarget.value as typeof orden)} data={[
        { value: 'ascendente', label: 'Más antiguo primero' }, { value: 'descendente', label: 'Más reciente primero' },
      ]} />
      <NativeSelect label="Caso a revisar" value={caso} onChange={(evento) => cambiarCaso(evento.currentTarget.value)} data={[
        { value: 'normal', label: 'Recorrido con recepción sin cambio de estado' },
        { value: 'recepcion', label: 'Solo recepción: el despacho continúa Fallido' },
        { value: 'opcionales', label: 'Evento sin datos opcionales' },
        { value: 'empates', label: 'Fechas equivalentes: conservar orden recibido' },
        { value: 'observaciones', label: 'Observaciones extensas en varias líneas' },
        { value: 'desconocido', label: 'Estado desconocido del servidor' },
        { value: 'fechaInvalida', label: 'Fecha de servidor no disponible' },
      ]} />
      <HistorialEstados
        entradas={casos[caso]}
        estado={estado}
        orden={orden}
        alReintentar={() => {
          cambiarEstado('carga');
          temporizador.current = window.setTimeout(() => cambiarEstado('datos'), 600);
        }}
      />
    </Stack>
  </Container>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><MantineProvider theme={tema}><EjemploHistorialEstados /></MantineProvider></StrictMode>);
