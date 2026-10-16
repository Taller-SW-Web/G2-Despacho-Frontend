import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Container, MantineProvider, NativeSelect, Paper, Stack, Switch, Text, Title } from '@mantine/core';
import { ModalConfirmacion, tema } from '@despacho/componentes-compartidos';
import '@mantine/core/styles.css';
import '@despacho/componentes-compartidos/tokens.css';

const casos = {
  zona: { titulo: '¿Activar la zona Lima Norte?', descripcion: 'La zona estará disponible para nuevas cotizaciones.', etiqueta: 'Activar zona', objeto: 'Zona de prueba ZN-001 · Lima Norte', intencion: 'principal' },
  vehiculo: { titulo: '¿Dar de baja el vehículo DEMO-001?', descripcion: 'El vehículo dejará de estar disponible para nuevas jornadas. Se conservarán sus registros anteriores.', etiqueta: 'Dar de baja', objeto: 'Vehículo de prueba DEMO-001', intencion: 'destructiva' },
  jornada: { titulo: '¿Cerrar tu jornada de prueba?', descripcion: 'Los despachos pendientes quedarán como No intentado y sus paquetes deberán devolverse al centro. Esta acción no se puede deshacer.', etiqueta: 'Sí, cerrar jornada', objeto: 'Jornada de prueba · 3 despachos pendientes', intencion: 'destructiva' },
} as const;

function EjemploModalConfirmacion() {
  const [caso, cambiarCaso] = useState<keyof typeof casos>('vehiculo');
  const [resultado, cambiarResultado] = useState('error');
  const [abierto, cambiarAbierto] = useState(false);
  const [procesando, cambiarProcesando] = useState(false);
  const [bloqueada, cambiarBloqueada] = useState(false);
  const [error, cambiarError] = useState<string>();
  const [ultimoResultado, cambiarUltimoResultado] = useState('Todavía no se ejecutó ninguna operación simulada.');
  const temporizador = useRef<number | undefined>(undefined);
  const datos = casos[caso];

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  function confirmar() {
    if (procesando) return;
    cambiarProcesando(true);
    cambiarError(undefined);
    temporizador.current = window.setTimeout(() => {
      cambiarProcesando(false);
      if (resultado === 'error') {
        cambiarError('No pudimos completar la operación. Revisa tu conexión e inténtalo nuevamente.');
      } else {
        cambiarAbierto(false);
        cambiarUltimoResultado('Operación simulada completada. El contenedor cerró la confirmación.');
      }
    }, 3000);
  }

  return <Container size="sm" py="xl" component="main">
    <Stack gap="lg">
      <div>
        <Title order={1}>Confirmar una acción</Title>
        <Text>Ejemplo de desarrollo. Todas las operaciones son simuladas y usan datos de prueba.</Text>
      </div>
      <NativeSelect label="Caso a revisar" data={[
        { value: 'zona', label: 'Activar zona · principal' },
        { value: 'vehiculo', label: 'Dar de baja vehículo · destructiva' },
        { value: 'jornada', label: 'Cerrar jornada · destructiva' },
      ]} value={caso} onChange={(evento) => cambiarCaso(evento.currentTarget.value as keyof typeof casos)} />
      <NativeSelect label="Resultado de la operación simulada" data={[
        { value: 'error', label: 'Error: mantener contexto y permitir reintentar' },
        { value: 'exito', label: 'Éxito: el contenedor cierra el modal' },
      ]} value={resultado} onChange={(evento) => cambiarResultado(evento.currentTarget.value)} />
      <Switch label="Bloquear la confirmación" checked={bloqueada} onChange={(evento) => cambiarBloqueada(evento.currentTarget.checked)} />
      {bloqueada && <Text>La confirmación está bloqueada por una regla de prueba del consumidor.</Text>}
      <Button onClick={() => { cambiarError(undefined); cambiarAbierto(true); }}>Abrir confirmación</Button>
      <Text role="status">{ultimoResultado}</Text>
      <ModalConfirmacion
        abierto={abierto}
        titulo={datos.titulo}
        descripcion={datos.descripcion}
        etiquetaConfirmar={datos.etiqueta}
        intencion={datos.intencion}
        procesando={procesando}
        confirmacionDeshabilitada={bloqueada}
        error={error}
        alConfirmar={confirmar}
        alCancelar={() => { cambiarAbierto(false); cambiarUltimoResultado('La confirmación se canceló sin ejecutar la operación.'); }}
      >
        <Paper withBorder p="md" radius="md"><Text>{datos.objeto}</Text></Paper>
        {bloqueada && <Text>La confirmación está bloqueada por una regla de prueba del consumidor.</Text>}
      </ModalConfirmacion>
    </Stack>
  </Container>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><MantineProvider theme={tema}><EjemploModalConfirmacion /></MantineProvider></StrictMode>);
