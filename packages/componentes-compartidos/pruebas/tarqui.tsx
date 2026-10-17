/** Fixture aislada con datos simulados; no es una pantalla funcional de F-02. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Group, MantineProvider, Radio, Select, Stack, Tabs, Text, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import { BarraFiltros, EncabezadoPagina, TablaDatos, TarjetaRepartidor, tema } from '../src';
import type { EstadoConsulta, OrdenUi, PropiedadesTarjetaRepartidor } from '../src';
import '../src/tokens.css';
import './tarqui.css';

const metricas: NonNullable<PropiedadesTarjetaRepartidor['metricas']> = [
  { metrica: 'peso', usado: 320, limite: 500, proyeccion: 332 },
  { metrica: 'volumen', usado: 3.2, limite: 4, proyeccion: 3.4 },
  { metrica: 'paquetes', usado: 20, limite: 30, proyeccion: 21 },
];
const filas = [
  { id: 'uno', codigo: 'DSP-000123', pedido: 'PED-2026-00891', zona: 'Lima Centro', direccion: 'Av. Arequipa 1234, Lince', peso: 12, volumen: 0.2, espera: '12 min' },
  { id: 'dos', codigo: 'DSP-000124', pedido: 'PED-2026-00892', zona: 'Lima Norte', direccion: 'Av. Túpac Amaru 2345, Independencia', peso: 3, volumen: 0.1, espera: '20 min' },
];

function Ejemplo() {
  const [busqueda, setBusqueda] = useState('');
  const [consulta, setConsulta] = useState('');
  const [zona, setZona] = useState<string | null>('Lima Centro');
  const [orden, setOrden] = useState<OrdenUi>(null);
  const [seleccion, setSeleccion] = useState('');
  const [estado, setEstado] = useState<EstadoConsulta>('datos');
  const [detalle, setDetalle] = useState('');
  return <main className="prueba-contenido">
    <Stack gap="lg">
      <EncabezadoPagina titulo="Programación y asignación" subtitulo="Fixture con datos simulados · componentes CR-05, CR-06, CR-07 y CR-20"
        migas={[{ id: 'inicio', etiqueta: 'Inicio', ruta: '#inicio' }, { id: 'programacion', etiqueta: 'Programación', ruta: '#programacion' }]}
        acciones={<Button variant="outline" color="orange.8">Generar pedido de prueba</Button>}
        pestanias={<Tabs defaultValue="cola"><Tabs.List><Tabs.Tab value="cola">Cola de pendientes</Tabs.Tab><Tabs.Tab value="rutas">Rutas por repartidor</Tabs.Tab></Tabs.List></Tabs>} />
      <BarraFiltros busqueda={busqueda} etiquetaBusqueda="Buscar despacho" alCambiarBusqueda={setBusqueda} alConsultarBusqueda={setConsulta}
        activos={zona ? [{ id: 'zona', etiqueta: zona }] : []} alQuitarFiltro={() => setZona(null)}
        alLimpiar={() => { setBusqueda(''); setConsulta(''); setZona(null); }}
        controles={<Group align="flex-end"><Select label="Zona" size="sm" value={zona} onChange={setZona} clearable clearButtonProps={{ 'aria-label': 'Limpiar zona' }} data={['Lima Centro', 'Lima Norte']} />
          <TextInput label="Fecha programada" size="sm" placeholder="DD/MM/AAAA" /></Group>} />
      <Text size="sm">Última búsqueda consultada: {consulta || 'Sin búsqueda'}</Text>
      <Select label="Estado de consulta simulado" value={estado} onChange={(valor) => setEstado(valor as EstadoConsulta)}
        data={['datos', 'carga', 'vacio', 'sinResultados', 'error', 'sinPermiso', 'noEncontrado']} />
      <TablaDatos filas={filas} obtenerId={(fila) => fila.id} tituloAccesible="Cola de pendientes · datos simulados" estado={estado}
        orden={orden} alCambiarOrden={setOrden} paginacion={{ pagina: 1, tamanioPagina: 20, total: 2 }} alCambiarPagina={() => {}}
        columnas={[
          { id: 'codigo', encabezado: 'Código de rastreo', celda: (fila) => fila.codigo, ordenable: true },
          { id: 'pedido', encabezado: 'Pedido', celda: (fila) => fila.pedido, prioridadResponsive: 'secundaria' },
          { id: 'zona', encabezado: 'Zona', celda: (fila) => fila.zona },
          { id: 'direccion', encabezado: 'Dirección', celda: (fila) => fila.direccion },
          { id: 'peso', encabezado: 'Peso', celda: (fila) => `${fila.peso} kg`, alineacion: 'right' },
          { id: 'volumen', encabezado: 'Volumen', celda: (fila) => `${fila.volumen} m³`, alineacion: 'right', prioridadResponsive: 'secundaria' },
          { id: 'espera', encabezado: 'Tiempo en espera', celda: (fila) => fila.espera, prioridadResponsive: 'secundaria' },
        ]} renderizarAcciones={(fila) => <Button type="button" variant="subtle" color="orange.8" size="sm" mih={44} onClick={() => setDetalle(`${fila.pedido} · ${fila.volumen} m³ · ${fila.espera}`)}>Ver detalle</Button>} />
      {detalle && <Text role="status">{detalle}</Text>}
      <Radio.Group label="Repartidor" value={seleccion} description="Seleccionar no confirma una asignación." descriptionProps={{ c: 'gray.7' }}>
        <Stack gap="md">
          <TarjetaRepartidor idRepartidor="juan" nombre="Juan Pérez" placa="ABC-123" zona="Lima Centro" estadoOperativo="DISPONIBLE"
            metricas={metricas} seleccionada={seleccion === 'juan'} alSeleccionar={setSeleccion} />
          <TarjetaRepartidor idRepartidor="ana" nombre="Ana Torres" placa="XYZ-987" zona="Lima Centro" estadoOperativo="EN_RUTA"
            metricas={[{ ...metricas[0], proyeccion: 540 }, metricas[1], metricas[2]]} disabled motivoDeshabilitado="Capacidad de carga del repartidor excedida: peso. Excede 40 kg."
            alSeleccionar={setSeleccion} />
          <TarjetaRepartidor idRepartidor="luis" nombre="Luis Díaz" placa="DEF-456" zona="Lima Norte" estadoOperativo="EN_RUTA"
            metricas={metricas} seleccionada={seleccion === 'luis'} alSeleccionar={setSeleccion} />
        </Stack>
      </Radio.Group>
    </Stack>
  </main>;
}

createRoot(document.getElementById('root')!).render(<MantineProvider theme={tema}><Ejemplo /></MantineProvider>);
