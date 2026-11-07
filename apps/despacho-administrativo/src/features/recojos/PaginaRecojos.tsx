import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Group, Stack, Tabs, Text } from '@mantine/core';
import { IconCamera, IconFlask, IconRefresh } from '@tabler/icons-react';
import { BadgeEstado, EncabezadoPagina, EstadoVista, TablaDatos, VisorEvidencia, type ColumnaDatos } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { fechaBogota } from '../jornadas/modelo';
import { useEvidenciaIncidencia } from '../entregas-fallidas/useEvidenciaIncidencia';
import { useLecturaProgramacion } from '../programacion/useLecturaProgramacion';
import { consultarRecojos } from './api';
import { ModalAsignarRecojo } from './ModalAsignarRecojo';
import { ModalGenerarRecojo } from './ModalGenerarRecojo';
import { ModalResolverRecojo } from './ModalResolverRecojo';
import { ESTADOS_POR_ASIGNAR, ESTADOS_POR_RESOLVER, type AccionRecojo, type Recojo } from './modelo';

type Dialogo = { tipo: 'generar' } | { tipo: 'asignar'; recojo: Recojo } | { tipo: 'resolver'; recojo: Recojo; accion: AccionRecojo } | { tipo: 'evidencia'; recojo: Recojo };

function EvidenciaRecojo({ recojo, alCerrar }: { recojo: Recojo; alCerrar: () => void }) {
  const visor = useEvidenciaIncidencia(recojo.idDespacho, recojo.idRecojo, recojo.idEvidencia ?? null, alCerrar);
  const abrir = visor.abrir;
  // El visor se monta al pedir la foto: la solicitud de acceso ocurre una sola vez.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void abrir(); }, []);
  const propiedades = visor.estado === 'lista' && visor.url ? { estado: 'lista' as const, urlAutorizada: visor.url }
    : { estado: visor.estado === 'lista' ? 'error' as const : visor.estado, urlAutorizada: null };
  return <VisorEvidencia {...propiedades} abierto descripcion={`Evidencia del recojo ${recojo.codigoRastreoInterno}`}
    mensajeSinEvidencia="Este recojo no tiene fotografía." alCerrar={alCerrar} alSolicitarAcceso={() => void visor.abrir()} alFallarImagen={visor.fallarImagen} />;
}

/** ES-F02-09 y ES-F04-07: sección propia del Gestor para los recojos de devoluciones. */
export function PaginaRecojos() {
  const cliente = useClienteApi();
  const [pestania, establecerPestania] = useState<'asignar' | 'resolver'>('asignar');
  const [pagina, establecerPagina] = useState(1);
  const [dialogo, establecerDialogo] = useState<Dialogo | null>(null);
  const estados = pestania === 'asignar' ? ESTADOS_POR_ASIGNAR : ESTADOS_POR_RESOLVER;
  const cargar = useCallback((signal: AbortSignal) => consultarRecojos(cliente, estados, pagina, signal), [cliente, estados, pagina]);
  const consulta = useLecturaProgramacion(cargar);
  const cerrar = () => { establecerDialogo(null); consulta.actualizar(); };
  const hoy = fechaBogota();
  const columnas: ColumnaDatos<Recojo>[] = [
    { id: 'codigo', encabezado: 'Código', celda: (r) => <Stack gap={4}><Text className="ia-num">{r.codigoRastreoInterno}</Text>
      {r.esSimulado && <BadgeEstado contexto="etiqueta" valor="SIMULADO" size="sm" />}</Stack> },
    { id: 'domicilio', encabezado: 'Domicilio', celda: (r) => <Stack gap={0}><Text>{r.direccion}, {r.distrito}</Text><Text size="xs" c="dimmed">{r.destinatario}</Text></Stack> },
    { id: 'productos', encabezado: 'Productos', celda: (r) => r.lineas.map((l) => `${l.cantidad} × ${l.sku}`).join(', ') },
    { id: 'fecha', encabezado: 'Fecha', celda: (r) => r.fechaProgramada },
    { id: 'estado', encabezado: 'Estado', celda: (r) => <Stack gap={4}><BadgeEstado contexto="despacho" valor={r.estado} size="sm" />
      {r.etiquetaMotivo && <Text size="xs">{r.etiquetaMotivo}</Text>}{r.numeroIntentos > 0 && <Text size="xs" c="dimmed">{r.numeroIntentos} intentos</Text>}</Stack> },
    { id: 'acciones', encabezado: 'Acciones', celda: (r) => <Group gap="xs">
      {r.estado === 'PENDIENTE_ASIGNACION' && <Button size="sm" disabled={r.fechaProgramada > hoy} aria-label={`Asignar recojo ${r.codigoRastreoInterno}`}
        onClick={() => establecerDialogo({ tipo: 'asignar', recojo: r })}>Asignar</Button>}
      {r.estado === 'RECOGIDO' && <Button size="sm" aria-label={`Confirmar recepción de ${r.codigoRastreoInterno}`}
        onClick={() => establecerDialogo({ tipo: 'resolver', recojo: r, accion: 'recepcion' })}>Confirmar recepción</Button>}
      {r.estado === 'FALLIDO' && <>
        <Button size="sm" aria-label={`Reprogramar ${r.codigoRastreoInterno}`} onClick={() => establecerDialogo({ tipo: 'resolver', recojo: r, accion: 'reprogramacion' })}>Reprogramar</Button>
        <Button size="sm" variant="outline" color="red" aria-label={`Cerrar ${r.codigoRastreoInterno}`} onClick={() => establecerDialogo({ tipo: 'resolver', recojo: r, accion: 'cierre' })}>Cerrar</Button>
      </>}
      {r.idEvidencia && <Button size="sm" variant="subtle" leftSection={<IconCamera size={16} aria-hidden="true" />} aria-label={`Ver foto de ${r.codigoRastreoInterno}`}
        onClick={() => establecerDialogo({ tipo: 'evidencia', recojo: r })}>Ver foto</Button>}
    </Group> },
  ];
  if (consulta.error?.permiso) return <EstadoVista estado="sinPermiso" descripcion="Tu sesión no permite consultar los recojos." />;
  const datos = consulta.datos;
  return <Stack gap="lg">
    <EncabezadoPagina titulo="Recojos" subtitulo="Asigna las devoluciones a una jornada de recojos y resuelve su resultado."
      acciones={<Group gap="sm">
        <Button variant="outline" leftSection={<IconRefresh size={20} aria-hidden="true" />} onClick={consulta.actualizar}>Actualizar</Button>
        <Button variant="outline" leftSection={<IconFlask size={20} aria-hidden="true" />} onClick={() => establecerDialogo({ tipo: 'generar' })}>Generar recojo de prueba</Button>
      </Group>} />
    <Tabs value={pestania} onChange={(valor) => { establecerPestania(valor === 'resolver' ? 'resolver' : 'asignar'); establecerPagina(1); }}>
      <Tabs.List><Tabs.Tab value="asignar">Por asignar</Tabs.Tab><Tabs.Tab value="resolver">Por resolver</Tabs.Tab></Tabs.List>
    </Tabs>
    {consulta.error && <Alert color="red" role="alert" title="No se pudo cargar">{consulta.error.mensaje}</Alert>}
    <TablaDatos filas={datos?.contenido ?? []} columnas={columnas} obtenerId={(r) => r.idRecojo} tituloAccesible="Recojos"
      estado={consulta.cargando && !datos ? 'carga' : consulta.error ? 'error' : datos?.contenido.length ? 'datos' : 'vacio'} actualizando={consulta.cargando}
      paginacion={{ pagina: datos?.pagina ?? 1, tamanioPagina: datos?.tamanoPagina ?? 50, total: datos?.totalElementos ?? 0 }} alCambiarPagina={establecerPagina} />
    {dialogo?.tipo === 'generar' && <ModalGenerarRecojo alCerrar={() => establecerDialogo(null)} alGenerar={cerrar} />}
    {dialogo?.tipo === 'asignar' && <ModalAsignarRecojo recojo={dialogo.recojo} alCerrar={() => establecerDialogo(null)} alAsignar={cerrar} />}
    {dialogo?.tipo === 'resolver' && <ModalResolverRecojo recojo={dialogo.recojo} accion={dialogo.accion} hoy={hoy} alCerrar={() => establecerDialogo(null)} alResolver={cerrar} />}
    {dialogo?.tipo === 'evidencia' && <EvidenciaRecojo recojo={dialogo.recojo} alCerrar={() => establecerDialogo(null)} />}
  </Stack>;
}
