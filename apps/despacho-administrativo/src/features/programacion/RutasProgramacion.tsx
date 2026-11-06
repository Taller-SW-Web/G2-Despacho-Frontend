import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Alert, Button, Card, Group, Select, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconGripVertical } from '@tabler/icons-react';
import { BadgeEstado, BarraAccionesFija, EstadoVista, notificarOperacion } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { interpretarError, type ErrorProgramacion } from './api';
import { consultarJornadasRuta, consultarRuta, guardarSecuencia } from './rutasApi';
import { bloqueoSecuencia, enProceso, intercambiar, prepararSecuencia, type ComandoSecuencia, type Parada } from './rutasModelo';
import { formatoInstante } from './modelo';
import { useLecturaProgramacion, useVigenciaProgramacion } from './useLecturaProgramacion';
import { ModalReasignacion } from './ModalReasignacion';
import clases from './Programacion.module.css';

type JornadaRuta = Awaited<ReturnType<typeof consultarJornadasRuta>>[number];
export function RutasProgramacion({ alDenegar, alOcupar }: { alDenegar: () => void; alOcupar: (valor: boolean) => void }) {
  const cliente = useClienteApi();
  const cargar = useCallback((signal: AbortSignal) => consultarJornadasRuta(cliente, signal), [cliente]);
  const catalogo = useLecturaProgramacion(cargar);
  const [jornada, elegir] = useState<JornadaRuta | null>(null);
  const [ocupada, ocupar] = useState(false);
  const cambiarOcupada = useCallback((valor: boolean) => { ocupar(valor); alOcupar(valor); }, [alOcupar]);
  useEffect(() => { if (catalogo.error?.permiso) alDenegar(); }, [catalogo.error, alDenegar]);
  useVigenciaProgramacion(catalogo.actualizar, !ocupada);
  return <Stack gap="lg" mt="lg">
    <Select label="Jornada / repartidor" placeholder={catalogo.cargando ? 'Cargando jornadas' : 'Selecciona una jornada de hoy'} searchable clearable
      disabled={ocupada || catalogo.cargando || Boolean(catalogo.error)} value={jornada?.idJornada ?? null}
      data={(catalogo.datos ?? []).map((j) => ({ value: j.idJornada, label: `${j.nombre} · ${j.placa} · ${j.estado}` }))}
      onChange={(id) => elegir(catalogo.datos?.find((j) => j.idJornada === id) ?? null)} />
    {catalogo.error && <Alert color="red.8" title="No se pudieron consultar las jornadas" role="alert">
      <Text>{catalogo.error.mensaje}</Text><Button variant="outline" mt="sm" disabled={ocupada} onClick={catalogo.actualizar}>Reintentar jornadas</Button>
    </Alert>}
    {!catalogo.cargando && catalogo.datos?.length === 0 && <EstadoVista estado="vacio" titulo="No hay jornadas para consultar hoy" />}
    {jornada && <EditorRuta key={jornada.idJornada} jornada={jornada} alDenegar={alDenegar} alOcupar={cambiarOcupada} alActualizarCatalogo={catalogo.actualizar} />}
  </Stack>;
}

function EditorRuta({ jornada, alDenegar, alOcupar, alActualizarCatalogo }: {
  jornada: JornadaRuta; alDenegar: () => void; alOcupar: (valor: boolean) => void; alActualizarCatalogo: () => void;
}) {
  const cliente = useClienteApi();
  const cargar = useCallback((signal: AbortSignal) => consultarRuta(cliente, jornada.idJornada, signal, jornada.idRepartidor), [cliente, jornada.idJornada, jornada.idRepartidor]);
  const consulta = useLecturaProgramacion(cargar);
  const ruta = consulta.datos;
  const [borrador, cambiarBorrador] = useState<string[] | null>(null);
  const [guardando, guardar] = useState(false);
  const [error, establecerError] = useState<ErrorProgramacion | null>(null);
  const [comando, conservarComando] = useState<ComandoSecuencia | null>(null);
  const [reasignacion, reasignar] = useState<Parada | null>(null);
  const [anuncio, anunciar] = useState('');
  const ocupado = useRef(false), vigente = useRef(true), arrastrada = useRef<string | null>(null);
  const origenModal = useRef<HTMLButtonElement | null>(null), actualizarBoton = useRef<HTMLButtonElement>(null);
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
  const orden = borrador ?? ruta?.despachos.map((p) => p.idDespacho) ?? [];
  const cambios = ruta ? ruta.despachos.filter((p, i) => p.idDespacho !== orden[i]).length : 0;
  const incierto = Boolean(error?.incierto), bloqueo = ruta ? bloqueoSecuencia(ruta) : 'Actualiza la ruta.';
  const bloqueada = !ruta || consulta.cargando || Boolean(consulta.error || error) || guardando || Boolean(reasignacion);
  const pendientes = cambios > 0 || guardando || incierto || Boolean(reasignacion);
  useEffect(() => { alOcupar(pendientes); return () => alOcupar(false); }, [pendientes, alOcupar]);
  useEffect(() => {
    if (!pendientes) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [pendientes]);
  useEffect(() => { if (consulta.error?.permiso) alDenegar(); }, [consulta.error, alDenegar]);
  useVigenciaProgramacion(consulta.actualizar, !pendientes && !error);
  const actualizar = () => { cambiarBorrador(null); establecerError(null); consulta.actualizar(); alActualizarCatalogo(); };
  function mover(origen: string, destino: string) {
    if (!ruta || bloqueada || bloqueo) return;
    const nueva = intercambiar(ruta, orden, origen, destino);
    const original = nueva.every((id, i) => id === ruta.despachos[i].idDespacho);
    cambiarBorrador(original ? null : nueva);
    anunciar(original ? 'Orden original restaurado; sin cambios pendientes.'
      : `Nuevo orden pendiente. ${ruta.despachos.find((p) => p.idDespacho === origen)?.codigoOperativo}, posición ${nueva.indexOf(origen) + 1}.`);
  }
  async function confirmar(recuperar = false) {
    if (ocupado.current || !ruta || (!recuperar && (bloqueada || bloqueo || !cambios))) return;
    let original = comando;
    if (!recuperar) {
      try { original = prepararSecuencia(ruta, orden); }
      catch (fallo) { establecerError(interpretarError(fallo)); return; }
    }
    if (!original) return;
    ocupado.current = true; guardar(true); conservarComando(original); establecerError(null);
    try {
      await guardarSecuencia(cliente, original);
      if (!vigente.current) return;
      conservarComando(null); cambiarBorrador(null); consulta.actualizar();
      anunciar('Secuencia de ruta guardada.');
      notificarOperacion({ id: `secuencia-${original.clave}`, tipo: 'exito', mensaje: 'Secuencia de ruta actualizada.' });
    } catch (fallo) {
      if (!vigente.current) return;
      const interpretado = interpretarError(fallo, true);
      if (interpretado.permiso) alDenegar();
      else { establecerError(interpretado); if (!interpretado.incierto) conservarComando(null); }
    } finally { ocupado.current = false; if (vigente.current) guardar(false); }
  }
  function cerrarReasignacion() {
    reasignar(null); actualizar();
    requestAnimationFrame(() => {
      if (origenModal.current?.isConnected) origenModal.current.focus();
      else actualizarBoton.current?.focus();
    });
  }
  const paradas = orden.flatMap((id) => ruta?.despachos.find((p) => p.idDespacho === id) ?? []);
  const movibles = paradas.filter((p) => p.estado === 'ASIGNADO');
  return <Stack gap="lg">
    <Group justify="space-between" align="start">
      <div><Title order={2}>Ruta de {jornada.nombre}</Title><Text size="sm">Vehículo {jornada.placa} · {ruta?.estadoJornada ?? jornada.estado}</Text>
        {ruta && <Text size="sm" c="dimmed">Consulta: {formatoInstante.format(new Date(ruta.consultadoEn))} · America/Lima</Text>}</div>
      <Button ref={actualizarBoton} variant="outline" disabled={guardando || incierto || Boolean(reasignacion)} onClick={actualizar}>
        {cambios ? 'Descartar y actualizar ruta' : 'Actualizar ruta'}</Button>
    </Group>
    <Text role="status" aria-live="polite">{anuncio}</Text>
    {consulta.cargando ? <EstadoVista estado="carga" esqueleto={<Skeleton height={144} />} /> : consulta.error ? <EstadoVista estado="error" descripcion={consulta.error.mensaje}
      accion={{ id: 'reintentar', etiqueta: 'Reintentar ruta' }} alAccionar={actualizar} />
      : ruta?.despachos.length === 0 ? <EstadoVista estado="vacio" titulo="No hay despachos en esta ruta" /> : null}
    {ruta && bloqueo && <Alert color="yellow.8" title="Reordenamiento no disponible">{bloqueo}</Alert>}
    {error && <Alert color="red.8" title="No se pudo confirmar el orden" role="alert">
      <Text>{incierto ? 'No conocemos el resultado. Recupera la respuesta original con la misma clave y contenido; no crees otro guardado.' : error.mensaje}</Text>
      {incierto && <Button mt="sm" variant="outline" loading={guardando} onClick={() => { void confirmar(true); }}>Recuperar mismo guardado</Button>}
      {!incierto && <Button mt="sm" variant="outline" onClick={actualizar}>Descartar y consultar estado actual</Button>}
    </Alert>}
    <Stack component="ol" aria-label="Paradas de la jornada" className={clases.ruta} gap="md">
      {paradas.map((p, i) => {
        const indice = movibles.findIndex((m) => m.idDespacho === p.idDespacho);
        const permiteMover = !bloqueada && !bloqueo && p.estado === 'ASIGNADO';
        return <Card component="li" key={p.idDespacho} padding="md" radius="md" withBorder className={clases.parada}
          onDragOver={(e) => { if (permiteMover) e.preventDefault(); }} onDrop={(e) => {
            e.preventDefault(); const origen = arrastrada.current; arrastrada.current = null;
            if (permiteMover && origen && e.dataTransfer.getData('text/plain') === origen) mover(origen, p.idDespacho);
          }}>
          <Group justify="space-between" align="start"><div><Text fw={600}>#{cambios ? i + 1 : p.posicion} · {p.codigoOperativo}</Text>
            <Text>{p.codigoRastreoInterno} · Pedido {p.idPedido}</Text></div><BadgeEstado contexto="despacho" valor={p.estado} /></Group>
          <Text>{p.destinatario} · {p.direccion}</Text><Text size="sm">{p.pesoKg} kg · {p.volumenM3} m³ · {p.cantidadPaquetes} paquetes</Text>
          {enProceso(p) && <Text size="sm" c="red.8">Operación en proceso. Consulta su resultado antes de continuar.</Text>}
          <Group mt="sm" gap="sm">
            {p.estado === 'ASIGNADO' && <>
              <ActionIcon variant="subtle" size={44} aria-label={`Arrastrar ${p.codigoOperativo}`} disabled={!permiteMover} draggable={permiteMover}
                onDragStart={(e) => { if (!permiteMover) { e.preventDefault(); return; } arrastrada.current = p.idDespacho; e.dataTransfer.setData('text/plain', p.idDespacho); }}
                onDragEnd={() => { arrastrada.current = null; }}><IconGripVertical size={20} aria-hidden="true" /></ActionIcon>
              <ActionIcon variant="outline" size={44} aria-label={`Subir ${p.codigoOperativo}`} disabled={!permiteMover || indice < 1}
                onClick={() => mover(p.idDespacho, movibles[indice - 1].idDespacho)}><IconArrowUp size={20} aria-hidden="true" /></ActionIcon>
              <ActionIcon variant="outline" size={44} aria-label={`Bajar ${p.codigoOperativo}`} disabled={!permiteMover || indice >= movibles.length - 1}
                onClick={() => mover(p.idDespacho, movibles[indice + 1].idDespacho)}><IconArrowDown size={20} aria-hidden="true" /></ActionIcon>
              <Button variant="outline" disabled={bloqueada || cambios > 0 || ruta?.estadoJornada !== 'ACTIVA' || enProceso(p)} onClick={(e) => {
                origenModal.current = e.currentTarget; reasignar(p);
              }}>Reasignar {p.codigoOperativo}</Button>
            </>}
            {p.estado !== 'ASIGNADO' && <Text size="sm" c="dimmed">Posición histórica fija; solo lectura.</Text>}
          </Group>
        </Card>;
      })}
    </Stack>
    {cambios > 0 && <>
      <Text role="status">Hay {cambios} paradas modificadas sin guardar.</Text>
      <BarraAccionesFija principal={{ id: 'guardar', etiqueta: 'Guardar orden', loading: guardando, disabled: bloqueada || Boolean(bloqueo) }}
        secundaria={{ id: 'descartar', etiqueta: 'Descartar cambios', disabled: guardando || incierto }}
        alAccionar={(id) => { if (id === 'guardar') void confirmar(); else { cambiarBorrador(null); establecerError(null); anunciar('Cambios descartados.'); } }} />
    </>}
    {reasignacion && <ModalReasignacion parada={reasignacion} idJornada={jornada.idJornada} conductor={`${jornada.nombre} · ${jornada.placa}`}
      alCerrar={cerrarReasignacion} alConfirmar={cerrarReasignacion} alDenegar={alDenegar} />}
  </Stack>;
}
