import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Alert, Button, Card, Group, MantineProvider, NumberInput, Radio, Select, SimpleGrid, Skeleton, Stack, Text, TextInput, Title } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { IconCalendarTime, IconChartBar, IconMapPin, IconPackage, IconRoute, IconTruck } from '@tabler/icons-react';
import {
  accionesUi, camposFormulario, tema, ShellAdministrativo, ShellRepartidor, EncabezadoPagina,
  BarraFiltros, TablaDatos, EstadoVista, BadgeEstado, TarjetaKpi, BarraOcupacion, ModalConfirmacion,
  BarraAccionesFija, FranjaEstado, notificarOperacion, TarjetaDespacho, CapturaEvidencia,
  VisorEvidencia, HistorialEstados, TarjetaRepartidor,
} from '@despacho/componentes-compartidos';
import type { EstadoConsulta, EstadoVisorEvidencia } from '@despacho/componentes-compartidos';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@despacho/componentes-compartidos/tokens.css';
import './componentes-compartidos.css';

const sinOperacion = () => undefined;
const imagenEjemplo = new URL('./recursos/evidencia-a.svg', import.meta.url).href;
const destinos = [
  { id: 'biblioteca', ruta: '#biblioteca', etiqueta: 'Componentes compartidos', icono: <IconPackage size={24} /> },
  { id: 'listados', ruta: '#listados', etiqueta: 'Filtros y tablas', icono: <IconCalendarTime size={24} /> },
  { id: 'indicadores', ruta: '#indicadores', etiqueta: 'Indicadores y tarjetas', icono: <IconChartBar size={24} /> },
  { id: 'retroalimentacion', ruta: '#retroalimentacion', etiqueta: 'Estados y mensajes', icono: <IconMapPin size={24} /> },
  { id: 'repartidor', ruta: '#repartidor', etiqueta: 'Web del repartidor', icono: <IconTruck size={24} /> },
];
const metricas = [
  { metrica: 'peso' as const, usado: 320, limite: 500, proyeccion: 380 },
  { metrica: 'volumen' as const, usado: 2, limite: 5, proyeccion: 3 },
  { metrica: 'paquetes' as const, usado: 12, limite: 30, proyeccion: 16 },
] as const;

function Bloque({ id, titulo, children }: { id?: string; titulo: string; children: ReactNode }) {
  return <Card component="section" id={id} p={{ base: 'md', sm: 'lg' }}><Stack gap="lg"><Title order={2} size="h3">{titulo}</Title>{children}</Stack></Card>;
}

function RepartidorVisual() {
  const [archivo, cambiarArchivo] = useState<File | null>(null);
  const [pie, cambiarPie] = useState<string | null>('navegacion');
  return <ShellRepartidor titulo="Mi ruta" estadoOperativo="EN_RUTA" destinos={[
    { id: 'ruta', ruta: '#ruta', titulo: 'Mi ruta', icono: <IconRoute size={24} /> },
    { id: 'resumen', ruta: '#resumen', titulo: 'Resumen', icono: <IconChartBar size={24} /> },
    { id: 'cierre', ruta: '#cierre', titulo: 'Cerrar jornada', icono: <IconCalendarTime size={24} /> },
  ]} destinoActivo="ruta" alNavegar={sinOperacion} modoPie={pie === 'acciones' ? 'acciones' : 'navegacion'}
    accionesFijas={<BarraAccionesFija principal={{ id: 'confirmar', etiqueta: 'Confirmar entrega', disabled: true, motivoDeshabilitado: 'Selecciona una fotografía de evidencia antes de confirmar la entrega del paquete.' }} secundaria={{ id: 'volver', etiqueta: 'Volver a mi ruta' }} alAccionar={sinOperacion} />}>
    <Text>Datos de ejemplo para revisar la presentación.</Text>
    <Select label="Pie que deseas revisar" value={pie} onChange={cambiarPie} allowDeselect={false} data={[
      { value: 'navegacion', label: 'Navegación inferior' }, { value: 'acciones', label: 'Acciones con motivo de bloqueo' },
    ]} />
    <FranjaEstado tipo="fueraDeTurno" mensaje="Ejemplo de aviso: las acciones operativas requieren una jornada activa." />
    <TarjetaDespacho idDespacho="ejemplo-1" codigo="TRK-2026-0017" posicion={1} direccion="Av. Arequipa 1420, Miraflores" destinatario="Ana Mendoza" estado="ASIGNADO" etiquetaIntento="Intento 1 de 2" variante="siguiente" alAbrir={sinOperacion} />
    <TarjetaDespacho idDespacho="ejemplo-2" codigo="TRK-2026-0018" posicion={2} direccion="Entrega completada" destinatario="Luis Paredes" estado="ENTREGADO" etiquetaIntento="Intento 1 de 2" variante="resuelto" alAbrir={sinOperacion} />
    <SimpleGrid cols={2}><TarjetaKpi id="entregados" etiqueta="Entregados" valor={8} tono="success" /><TarjetaKpi id="pendientes" etiqueta="Pendientes" valor={4} tono="info" /></SimpleGrid>
    <CapturaEvidencia archivo={archivo} descripcionFoto="Fotografía de ejemplo seleccionada para revisar el componente" fase={archivo ? 'lista' : 'vacia'}
      politicaArchivo={{ tiposPermitidos: ['image/jpeg', 'image/png', 'image/webp'], maximoBytes: 2_097_152 }} alSeleccionar={cambiarArchivo} alVolverATomar={sinOperacion} alReintentar={sinOperacion} />
    <TextInput label="Último campo del formulario" description="El pie debe dejar visible este campo y su ayuda." />
  </ShellRepartidor>;
}

function GaleriaVisual() {
  const [destino, cambiarDestino] = useState('biblioteca');
  const [busqueda, cambiarBusqueda] = useState('');
  const [estado, cambiarEstado] = useState<EstadoConsulta>('vacio');
  const [modal, abrirModal] = useState(false);
  const [visor, abrirVisor] = useState(false);
  const [estadoVisor, cambiarEstadoVisor] = useState<EstadoVisorEvidencia>('lista');
  const [candidato, cambiarCandidato] = useState('ana');
  const [filtro, cambiarFiltro] = useState<string | null>(null);
  return <ShellAdministrativo destinos={destinos} destinoActivo={destino} usuario={{ nombre: 'María Torres', etiquetaPerfil: 'Gestor de Despacho' }} logoUrl="" rutaInicio="#biblioteca"
    alNavegar={(id) => { cambiarDestino(id); document.getElementById(id)?.scrollIntoView({ behavior: 'auto' }); }} alCerrarSesion={sinOperacion}
    contexto={<><Text size="xs" c="dimmed">SISTEMA DE DISEÑO</Text><Text size="sm" fw={500}>Biblioteca compartida · Ejemplos visuales</Text></>}>
    <Stack gap="lg" id="biblioteca">
      <EncabezadoPagina titulo="Componentes compartidos" subtitulo="Los 20 elementos del catálogo, con ejemplos para revisar estilos y distribución." />
      <Alert color="blue" title="CR-03 · Shell administrativo">Galería de desarrollo con datos ficticios. Sus acciones no registran operaciones ni consultan el backend.</Alert>
      <Bloque titulo="CR-01 y CR-02 · Acciones y campos">
        <Group><Button {...accionesUi.principal} type="button">Guardar zona</Button><Button {...accionesUi.secundaria} type="button">Cancelar</Button><Button {...accionesUi.terciaria} type="button">Ver detalle</Button><Button {...accionesUi.destructiva} type="button">Desactivar</Button><Button type="button" loading>Guardando zona</Button></Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }}><TextInput label="Nombre de la zona" placeholder="Ej. Lima Norte" /><NumberInput {...camposFormulario.moneda} label="Tarifa base" defaultValue={10} /><TextInput label="Campo con validación" defaultValue="" error="Ingresa un nombre para continuar." /></SimpleGrid>
      </Bloque>
      <Bloque id="listados" titulo="CR-05, CR-06 y CR-07 · Encabezado, filtros y tabla">
        <BarraFiltros busqueda={busqueda} etiquetaBusqueda="Buscar zona" alCambiarBusqueda={cambiarBusqueda} alConsultarBusqueda={sinOperacion}
          controles={<Select label="Estado" placeholder="Todos" data={['Activo', 'Inactivo']} value={filtro} onChange={cambiarFiltro} clearable />}
          activos={filtro ? [{ id: 'estado', etiqueta: filtro }] : []} alLimpiar={() => { cambiarBusqueda(''); cambiarFiltro(null); }} alQuitarFiltro={() => cambiarFiltro(null)} />
        <TablaDatos filas={[{ id: 'norte', nombre: 'Lima Norte', estado: 'ACTIVO', tarifa: 'S/ 10.00' }, { id: 'sur', nombre: 'Lima Sur', estado: 'INACTIVO', tarifa: 'S/ 12.00' }]}
          obtenerId={(fila) => fila.id} tituloAccesible="Zonas de ejemplo" estado="datos" anchoMinimo={560}
          columnas={[{ id: 'nombre', encabezado: 'Zona', celda: (fila) => fila.nombre }, { id: 'estado', encabezado: 'Estado', celda: (fila) => <BadgeEstado contexto="zona" valor={fila.estado} /> }, { id: 'tarifa', encabezado: 'Tarifa vigente', alineacion: 'right', celda: (fila) => fila.tarifa }]}
          paginacion={{ pagina: 1, tamanioPagina: 20, total: 2 }} renderizarAcciones={() => <Button type="button" variant="subtle" size="sm">Ver detalle</Button>} />
      </Bloque>
      <Bloque id="indicadores" titulo="CR-09, CR-10 y CR-11 · Estados e indicadores">
        <Group wrap="wrap">{['PENDIENTE_ASIGNACION', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'FALLIDO', 'DEVUELTO_A_ORIGEN', 'CANCELADO'].map((valor) => <BadgeEstado key={valor} contexto="despacho" valor={valor} />)}</Group>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}><TarjetaKpi id="pendientes" etiqueta="Pendientes de retorno" valor={14} tono="warning" descripcion="Incluye tres retornos atrasados" /><TarjetaKpi id="recibidos" etiqueta="Recibidos en centro" valor={8} tono="success" /><TarjetaKpi id="atrasados" etiqueta="Retornos atrasados" valor={3} tono="error" /></SimpleGrid>
        <BarraOcupacion metrica="peso" usado={320} limite={500} proyeccion={540} /><BarraOcupacion metrica="volumen" usado={4} limite={5} /><BarraOcupacion metrica="paquetes" usado={30} limite={30} variante="compacta" />
      </Bloque>
      <Bloque titulo="CR-20 · Selección de repartidor">
        <Radio.Group label="Repartidor" value={candidato} onChange={cambiarCandidato}><SimpleGrid cols={{ base: 1, md: 2 }} mt="sm">
          <TarjetaRepartidor idRepartidor="ana" nombre="Ana Mendoza" placa="ABC-123" zona="Lima Norte" estadoOperativo="DISPONIBLE" metricas={[...metricas]} seleccionada={candidato === 'ana'} alSeleccionar={cambiarCandidato} />
          <TarjetaRepartidor idRepartidor="luis" nombre="Luis Paredes" placa="XYZ-456" zona="Lima Sur" estadoOperativo="SATURADO" metricas={[{ ...metricas[0], proyeccion: 540 }, metricas[1], metricas[2]]} disabled motivoDeshabilitado="La carga proyectada excede la capacidad disponible." alSeleccionar={cambiarCandidato} />
        </SimpleGrid></Radio.Group>
      </Bloque>
      <Bloque id="retroalimentacion" titulo="CR-08, CR-14 y CR-15 · Mensajes y recuperación">
        <Select label="Estado de la vista" value={estado} onChange={(valor) => cambiarEstado(valor as EstadoConsulta)} allowDeselect={false} data={['carga', 'datos', 'vacio', 'sinResultados', 'error', 'sinPermiso', 'noEncontrado'].map((value) => ({ value, label: ({ carga: 'Carga', datos: 'Con datos', vacio: 'Vacío', sinResultados: 'Sin resultados', error: 'Error', sinPermiso: 'Acceso denegado', noEncontrado: 'No encontrado' } as Record<string, string>)[value] }))} />
        <EstadoVista estado={estado} esqueleto={<Stack><Skeleton height={48} /><Skeleton height={48} /><Skeleton height={48} /></Stack>} accion={{ id: 'recuperar', etiqueta: 'Reintentar' }} alAccionar={sinOperacion}><Text>Contenido disponible.</Text></EstadoVista>
        <FranjaEstado tipo="sinConexion" /><FranjaEstado tipo="datosDesactualizados" accion={{ id: 'actualizar', etiqueta: 'Actualizar datos', disabled: true, motivoDeshabilitado: 'Espera a recuperar la conexión antes de actualizar.' }} alAccionar={sinOperacion} />
        <Group><Button type="button" variant="outline" onClick={() => notificarOperacion({ id: 'visual-exito', tipo: 'exito', mensaje: 'La zona se guardó correctamente.' })}>Ver éxito</Button><Button type="button" variant="outline" onClick={() => notificarOperacion({ id: 'visual-pendiente', tipo: 'efectoPendiente', mensaje: 'La operación quedó registrada y su notificación sigue pendiente.' })}>Ver efecto pendiente</Button></Group>
      </Bloque>
      <Bloque titulo="CR-12 y CR-18 · Confirmación y evidencia">
        <Group><Button type="button" variant="outline" onClick={() => abrirModal(true)}>Ver confirmación destructiva</Button><Button type="button" variant="outline" onClick={() => abrirVisor(true)}>Ver fotografía de ejemplo</Button></Group>
        <Select label="Estado del visor" value={estadoVisor} onChange={(valor) => cambiarEstadoVisor(valor as EstadoVisorEvidencia)} allowDeselect={false} data={['lista', 'carga', 'sinEvidencia', 'expirada', 'error', 'sinPermiso'].map((value) => ({ value, label: ({ lista: 'Fotografía disponible', carga: 'Carga', sinEvidencia: 'Sin fotografía', expirada: 'Acceso vencido', error: 'Error', sinPermiso: 'Acceso denegado' } as Record<string, string>)[value] }))} />
      </Bloque>
      <HistorialEstados titulo="CR-19 · Historial de estados" estado="datos" entradas={[
        { id: 'fallo', fechaServidor: '2026-10-16T15:20:00Z', descripcionEvento: 'Intento de entrega registrado', estadoAnterior: 'EN_CAMINO', estadoNuevo: 'FALLIDO', observacion: 'El cliente no se encontraba en el domicilio.' },
        { id: 'retorno', fechaServidor: '2026-10-16T18:40:00Z', descripcionEvento: 'Paquete recibido en centro', estadoAnterior: 'FALLIDO', estadoNuevo: 'FALLIDO', ejecutor: 'María Torres' },
      ]} />
      <Bloque id="repartidor" titulo="CR-04, CR-13, CR-16 y CR-17 · Experiencia móvil">
        <iframe className="galeria-repartidor" title="Componentes del repartidor en ancho móvil" src="./componentes-compartidos.html?vista=repartidor" />
      </Bloque>
    </Stack>
    <ModalConfirmacion abierto={modal} titulo="¿Desactivar la zona Lima Norte?" descripcion="La zona dejará de aceptar nuevas cotizaciones. Los despachos registrados conservarán su información." etiquetaConfirmar="Desactivar zona" intencion="destructiva" alConfirmar={() => abrirModal(false)} alCancelar={() => abrirModal(false)} />
    <VisorEvidencia abierto={visor} estado={estadoVisor} urlAutorizada={imagenEjemplo} descripcion="Fotografía de ejemplo de un paquete para revisión visual" alCerrar={() => abrirVisor(false)} alSolicitarAcceso={() => cambiarEstadoVisor('lista')} alFallarImagen={() => cambiarEstadoVisor('error')} />
  </ShellAdministrativo>;
}

const vistaRepartidor = new URLSearchParams(window.location.search).get('vista') === 'repartidor';
createRoot(document.getElementById('root')!).render(<MantineProvider theme={tema} defaultColorScheme="light"><Notifications position="top-right" limit={3} />{vistaRepartidor ? <RepartidorVisual /> : <GaleriaVisual />}</MantineProvider>);
