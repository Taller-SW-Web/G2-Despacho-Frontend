import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Container, MantineProvider, Paper, Select, Skeleton, Stack, Switch, Table, Text, TextInput, Title } from '@mantine/core';
import type { AccionUi, EstadoConsulta } from '@despacho/componentes-compartidos';
import { EstadoVista, tema } from '@despacho/componentes-compartidos';
import '@mantine/core/styles.css';
import '@despacho/componentes-compartidos/tokens.css';

const estados: { value: EstadoConsulta; label: string }[] = [
  { value: 'carga', label: 'Cargando' },
  { value: 'datos', label: 'Con datos de prueba' },
  { value: 'vacio', label: 'Sin registros' },
  { value: 'sinResultados', label: 'Sin coincidencias' },
  { value: 'error', label: 'Error de consulta' },
  { value: 'sinPermiso', label: 'Acceso denegado' },
  { value: 'noEncontrado', label: 'Registro no encontrado' },
];

const acciones: Partial<Record<EstadoConsulta, AccionUi>> = {
  vacio: { id: 'crear', etiqueta: 'Crear registro' },
  sinResultados: { id: 'limpiar', etiqueta: 'Limpiar filtros' },
  error: { id: 'reintentar', etiqueta: 'Reintentar' },
  noEncontrado: { id: 'volver', etiqueta: 'Volver al listado' },
};

function EjemploEstadoVista() {
  const [estado, cambiarEstado] = useState<EstadoConsulta>('vacio');
  const [compacto, cambiarCompacto] = useState(false);
  const [bloqueo, cambiarBloqueo] = useState<string | null>('habilitada');
  const accion = acciones[estado];

  return <Container size="md" py="xl" component="main">
    <Stack gap="lg">
      <div>
        <Title order={1}>Estados de consulta</Title>
        <Text>Ejemplo de desarrollo con datos de prueba. No consulta servicios.</Text>
      </div>
      <Select label="Estado a revisar" data={estados} value={estado} onChange={(valor) => { if (valor) cambiarEstado(valor as EstadoConsulta); }} allowDeselect={false} />
      <Select label="Acción de recuperación" value={bloqueo} onChange={cambiarBloqueo} allowDeselect={false} data={[
        { value: 'habilitada', label: 'Habilitada' },
        { value: 'deshabilitada', label: 'Bloqueada con motivo' },
        { value: 'procesando', label: 'Operación en curso' },
      ]} />
      <Switch label="Presentación compacta" checked={compacto} onChange={(evento) => cambiarCompacto(evento.currentTarget.checked)} />
      <Paper withBorder radius="md">
        <EstadoVista
          estado={estado}
          compacto={compacto}
          esqueleto={<Stack p="md">{Array.from({ length: 5 }, (_, indice) => <Skeleton key={indice} height={48} />)}</Stack>}
          accion={accion ? { ...accion, disabled: bloqueo === 'deshabilitada', loading: bloqueo === 'procesando', motivoDeshabilitado: bloqueo === 'deshabilitada' ? 'Espera a que termine la actualización de la consulta antes de intentar recuperar la información.' : undefined } : undefined}
          alAccionar={() => cambiarEstado('datos')}
        >
          <Stack p="md">
            <TextInput label="Filtrar registros de prueba" placeholder="Buscar por código" />
            <Table>
              <Table.Caption>Registros de demostración</Table.Caption>
              <Table.Thead><Table.Tr><Table.Th>Código</Table.Th><Table.Th>Descripción</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody><Table.Tr><Table.Td>DEMO-001</Table.Td><Table.Td>Registro de prueba</Table.Td></Table.Tr></Table.Tbody>
            </Table>
          </Stack>
        </EstadoVista>
      </Paper>
    </Stack>
  </Container>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><MantineProvider theme={tema}><EjemploEstadoVista /></MantineProvider></StrictMode>);
