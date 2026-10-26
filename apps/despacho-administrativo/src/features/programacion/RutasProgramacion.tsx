import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Alert, Button, Card, Group, Modal, Select, Skeleton, Stack, Text } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconGripVertical, IconLock } from '@tabler/icons-react';
import { BadgeEstado, BarraAccionesFija, EstadoVista, notificarOperacion } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { interpretarError, type ErrorProgramacion } from './api';
import { useLecturaProgramacion, useVigenciaProgramacion } from './useLecturaProgramacion';
import { consultarJornadasRuta, consultarRuta, guardarSecuencia, moverParada, type ComandoSecuencia, type ParadaRuta } from './rutasApi';
import { formatoInstante, formatoNumero } from './modelo';

export function RutasProgramacion({ alCambiarPendientes, alDenegar }: { alCambiarPendientes: (valor: boolean, bloqueada: boolean) => void; alDenegar: () => void }) {
  const cliente = useClienteApi();
  const [jornada, establecerJornada] = useState<string | null>(null);
  const [destino, establecerDestino] = useState<string | null>(null);
  const [confirmarSalida, establecerConfirmarSalida] = useState(false);
  const [edicion, establecerEdicion] = useState<ParadaRuta[] | null>(null);
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState<ErrorProgramacion | null>(null);
  const [anuncio, establecerAnuncio] = useState('');
  const comando = useRef<ComandoSecuencia | null>(null);
  const enCurso = useRef(false);
  const arrastre = useRef<number | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const vigente = useRef(true);
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
  const cargarCatalogo = useCallback((signal: AbortSignal) => consultarJornadasRuta(cliente, signal), [cliente]);
  const catalogo = useLecturaProgramacion(cargarCatalogo);
  const cargarRuta = useCallback((signal: AbortSignal) => consultarRuta(cliente, jornada!, signal), [cliente, jornada]);
  const consulta = useLecturaProgramacion(cargarRuta, Boolean(jornada));
  const ruta = consulta.datos;
  const filas = edicion ?? ruta?.despachos ?? [];
  const cambios = edicion !== null && Boolean(ruta) && edicion.some((p, i) => p.idDespacho !== ruta!.despachos[i]?.idDespacho);
  const incierto = Boolean(error?.incierto);
  const pendiente = cambios || incierto || guardando;
  useEffect(() => { alCambiarPendientes(pendiente, guardando || incierto); return () => alCambiarPendientes(false, false); }, [pendiente, guardando, incierto, alCambiarPendientes]);
  useEffect(() => { if (catalogo.error?.permiso || consulta.error?.permiso) alDenegar(); }, [catalogo.error, consulta.error, alDenegar]);
  useEffect(() => {
    if (!pendiente) return;
    const avisar = (evento: BeforeUnloadEvent) => { evento.preventDefault(); };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [pendiente]);
  useVigenciaProgramacion(consulta.actualizar, Boolean(jornada) && !pendiente && !confirmarSalida);
  const bloqueada = guardando || incierto || consulta.cargando || Boolean(consulta.error) || ruta?.estadoJornada !== 'ACTIVA';
  const mover = (origen: number, destino: number) => {
    if (bloqueada) return;
    const nuevas = moverParada(filas, origen, destino);
    if (nuevas === filas) return;
    establecerEdicion(nuevas); establecerError(null); comando.current = null;
    establecerAnuncio(`${filas[origen].codigoOperativo} movido a la posición ${filas[destino].posicion}.`);
  };
  const cambiarJornada = (valor: string | null) => {
    if (guardando || incierto) return;
    if (cambios) { establecerDestino(valor); establecerConfirmarSalida(true); return; }
    establecerJornada(valor); establecerEdicion(null); establecerError(null); comando.current = null;
  };
  const guardar = async () => {
    if (enCurso.current || !ruta || !jornada || (!cambios && !incierto)) return;
    comando.current ??= { clave: crypto.randomUUID(), jornada, version: ruta.versionRuta,
      despachos: filas.map(({ idDespacho, posicion }) => ({ idDespacho, posicion })) };
    enCurso.current = true; establecerGuardando(true);
    try {
      await guardarSecuencia(cliente, comando.current);
      if (!vigente.current) return;
      comando.current = null; establecerError(null); establecerEdicion(null); consulta.actualizar();
      notificarOperacion({ id: `secuencia-${jornada}`, tipo: 'exito', mensaje: 'Secuencia de ruta actualizada.' });
      establecerAnuncio('Orden guardado. La ruta del repartidor se sincroniza en segundo plano.');
      requestAnimationFrame(() => titulo.current?.focus());
    } catch (fallo) {
      if (!vigente.current) return;
      const resultado = interpretarError(fallo, true);
      if (resultado.permiso) alDenegar();
      else {
        establecerError(resultado);
        if (!resultado.incierto) comando.current = null;
        if (resultado.estado === 409) { establecerEdicion(null); consulta.actualizar(); }
      }
    } finally {
      enCurso.current = false;
      if (vigente.current) establecerGuardando(false);
    }
  };
  return <Stack gap="lg">
    <Text component="h2" ref={titulo} tabIndex={-1} size="xl" fw={700}>Rutas por repartidor</Text>
    <Select label="Repartidor en jornada" placeholder="Selecciona una jornada" searchable clearable
      data={catalogo.datos ?? []} value={jornada} onChange={cambiarJornada} disabled={guardando || incierto || catalogo.cargando}
      error={catalogo.error?.mensaje} nothingFoundMessage="No hay jornadas activas" />
    {catalogo.error && <Button variant="outline" onClick={catalogo.actualizar}>Reintentar jornadas</Button>}
    {error && <Alert color={error.estado === 409 ? 'yellow' : 'red'} title={incierto ? 'Resultado sin confirmar' : 'No se pudo guardar el orden'}>
      <Text>{incierto ? 'Conservamos el guardado original. Recupera su resultado antes de editar o cambiar de jornada.' : error.estado === 409 ? 'La ruta cambió. Se descartó la edición y se solicitó la ruta vigente.' : error.mensaje}</Text>
      {incierto && <Button mt="sm" loading={guardando} onClick={() => { void guardar(); }}>Recuperar guardado</Button>}
    </Alert>}
    {jornada && <EstadoVista estado={consulta.cargando ? 'carga' : consulta.error ? 'error' : filas.length ? 'datos' : 'vacio'}
      esqueleto={<Skeleton height={180} />} accion={consulta.error ? { id: 'reintentar', etiqueta: 'Reintentar ruta' } : undefined}
      titulo={consulta.error ? 'No se pudo consultar la ruta' : 'Esta jornada no tiene despachos'} descripcion={consulta.error?.mensaje}
      alAccionar={consulta.actualizar}>
      <Stack gap="sm">
        <Group justify="space-between"><Text size="sm">{ruta && `Última consulta: ${formatoInstante.format(new Date(ruta.consultadoEn))}`}</Text>
          <Button variant="subtle" disabled={pendiente || consulta.cargando} onClick={consulta.actualizar}>Actualizar ruta</Button></Group>
        {ruta?.estadoJornada === 'CERRADA' && <Alert color="yellow">Jornada cerrada. Solo puedes consultar la ruta.</Alert>}
        {filas.map((parada, indice) => {
          const editable = parada.estado === 'ASIGNADO';
          const anterior = filas.map((p, i) => p.estado === 'ASIGNADO' && i < indice ? i : -1).filter((i) => i >= 0).at(-1) ?? -1;
          const siguiente = filas.findIndex((p, i) => p.estado === 'ASIGNADO' && i > indice);
          return <Card key={parada.idDespacho} withBorder padding="md" radius="md" data-testid={`parada-${parada.idDespacho}`}
            onDragOver={(evento) => { if (editable && !bloqueada) evento.preventDefault(); }}
            onDrop={(evento) => { evento.preventDefault(); if (arrastre.current !== null) mover(arrastre.current, indice); arrastre.current = null; }}>
            <Group wrap="wrap" justify="space-between">
              <Group>{editable ? <span draggable={!bloqueada} style={{ display: 'inline-flex', cursor: bloqueada ? 'default' : 'grab' }} aria-label={`Arrastrar ${parada.codigoOperativo}`}
                onDragStart={(evento) => { arrastre.current = indice; evento.dataTransfer.effectAllowed = 'move'; evento.dataTransfer.setData('text/plain', parada.idDespacho); }}
                onDragEnd={() => { arrastre.current = null; }}><IconGripVertical aria-hidden="true" /></span> : <IconLock aria-label="Posición fija" />}
                <Text fw={700}>#{parada.posicion} · {parada.codigoOperativo}</Text><BadgeEstado contexto="despacho" valor={parada.estado} /></Group>
              {editable && <Group gap="xs"><ActionIcon variant="outline" size="lg" aria-label={`Subir ${parada.codigoOperativo}`} disabled={bloqueada || anterior < 0} onClick={() => mover(indice, anterior)}><IconArrowUp /></ActionIcon>
                <ActionIcon variant="outline" size="lg" aria-label={`Bajar ${parada.codigoOperativo}`} disabled={bloqueada || siguiente < 0} onClick={() => mover(indice, siguiente)}><IconArrowDown /></ActionIcon></Group>}
            </Group>
            <Text size="sm" mt="xs">{parada.codigoRastreoInterno}</Text>
            <Text mt="sm">{parada.destinatario} · {parada.direccion}</Text>
            <Text size="sm">{formatoNumero.format(parada.pesoKg)} kg · {formatoNumero.format(parada.volumenM3)} m³ · {parada.cantidadPaquetes} {parada.cantidadPaquetes === 1 ? 'paquete' : 'paquetes'}</Text>
          </Card>;
        })}
      </Stack>
    </EstadoVista>}
    <Text role="status" aria-live="polite">{anuncio}</Text>
    {cambios && <><Alert color="yellow">Hay cambios sin guardar en la secuencia de ruta.</Alert>
      <BarraAccionesFija principal={{ id: 'guardar', etiqueta: 'Guardar orden', loading: guardando, disabled: bloqueada }}
        secundaria={{ id: 'descartar', etiqueta: 'Descartar cambios', disabled: guardando || incierto }}
        alAccionar={(id) => { if (id === 'guardar') void guardar(); else { establecerEdicion(null); establecerError(null); comando.current = null;
          establecerAnuncio('Se descartaron los cambios. Se restauró el orden guardado.'); titulo.current?.focus(); } }} /></>}
    <Modal opened={confirmarSalida} onClose={() => establecerConfirmarSalida(false)} title="¿Descartar los cambios?" centered>
      <Text>El nuevo orden todavía no se guardó.</Text><Group justify="flex-end" mt="md"><Button variant="subtle" onClick={() => establecerConfirmarSalida(false)}>Seguir editando</Button>
        <Button onClick={() => { establecerConfirmarSalida(false); establecerEdicion(null); establecerError(null); comando.current = null; establecerJornada(destino); }}>Descartar cambios</Button></Group>
    </Modal>
  </Stack>;
}
