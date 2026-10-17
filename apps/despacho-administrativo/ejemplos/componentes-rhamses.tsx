import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Group, MantineProvider, Paper, Stack, Text, Title } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BadgeEstado, ShellAdministrativo, notificarOperacion, tema } from '@despacho/componentes-compartidos';
import { estadosPorContexto, type ContextoEstado } from '@despacho/componentes-compartidos';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@despacho/componentes-compartidos/tokens.css';

const destinos = [
  { id: 'programacion', ruta: '#programacion', etiqueta: 'Programación' },
  { id: 'monitoreo', ruta: '#monitoreo', etiqueta: 'Monitoreo' },
  { id: 'fallidos', ruta: '#fallidos', etiqueta: 'Entregas fallidas' },
  { id: 'jornadas', ruta: '#jornadas', etiqueta: 'Asignación diaria' },
  { id: 'repartidores', ruta: '#repartidores', etiqueta: 'Repartidores' },
  { id: 'vehiculos', ruta: '#vehiculos', etiqueta: 'Vehículos' },
  { id: 'zonas', ruta: '#zonas', etiqueta: 'Zonas y Tarifas' },
];
function Ejemplo() {
  const [activo, cambiarActivo] = useState('monitoreo');
  const [evento, cambiarEvento] = useState('Sin acciones.');
  return <MantineProvider theme={tema} defaultColorScheme="light">
    <Notifications position="top-center" />
    <ShellAdministrativo destinos={destinos} destinoActivo={activo} usuario={{ nombre: 'Rhamses (simulación)', etiquetaPerfil: 'Gestor de despacho' }}
      logoUrl="" rutaInicio="#" alCerrarSesion={() => cambiarEvento('Cierre de sesión solicitado (simulado).')}
      alNavegar={(id) => cambiarActivo(id)}>
      <Stack>
        <Title order={1}>{destinos.find(({ id }) => id === activo)?.etiqueta}</Title>
        <Text>Ejemplo de desarrollo con datos simulados. Marca textual provisional; falta el logo autorizado.</Text>
        <Text role="status">{evento}</Text>
        <Group>
          <Button onClick={() => notificarOperacion({ id: 'operacion-demo', tipo: 'efectoPendiente', mensaje: 'Cierre registrado. Notificación a Ventas pendiente.', accion: { id: 'detalle', etiqueta: 'Ver detalle' }, alAccionar: cambiarEvento })}>Mostrar efecto pendiente</Button>
          <Button onClick={() => notificarOperacion({ id: 'operacion-demo', tipo: 'exito', mensaje: 'Notificación a Ventas confirmada.' })}>Confirmar efecto</Button>
          <Button onClick={() => notificarOperacion({ id: 'informacion-demo', tipo: 'informacion', mensaje: 'Revisa el detalle para continuar.' })}>Mostrar información</Button>
        </Group>
        {Object.entries(estadosPorContexto).map(([contexto, estados]) => <Paper key={contexto} withBorder p="md">
          <Title order={2}>{contexto}</Title>
          <Group mt="sm">{Object.keys(estados).map((valor) => <BadgeEstado key={valor} contexto={contexto as ContextoEstado} valor={valor} />)}</Group>
        </Paper>)}
        <Paper bg="ink.9" p="md"><Group><BadgeEstado contexto="despacho" valor="FALLIDO" /><BadgeEstado contexto="operacionRepartidor" valor="DISPONIBLE" /><BadgeEstado contexto="etiqueta" valor="NUEVO" /><BadgeEstado contexto="despacho" valor="desconocido" /></Group></Paper>
      </Stack>
    </ShellAdministrativo>
  </MantineProvider>;
}
createRoot(document.getElementById('root')!).render(<Ejemplo />);
