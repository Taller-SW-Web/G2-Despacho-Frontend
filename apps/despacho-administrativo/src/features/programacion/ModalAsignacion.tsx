import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Anchor, Button, Divider, Group, Modal, Radio, Skeleton, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { EstadoVista, notificarOperacion, TarjetaRepartidor } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { asignarDespacho, consultarDisponibles, interpretarError, type ErrorProgramacion } from './api';
import { dimensionesExcedidas, formatoNumero, type Pendiente, type RepartidorDisponible, type ZonaProgramacion } from './modelo';
import { useLecturaProgramacion, useVigenciaProgramacion } from './useLecturaProgramacion';
import { ResumenDespacho } from './ResumenDespacho';
import clases from './Programacion.module.css';

export function ModalAsignacion({ despacho, zonas, alCerrar, alActualizarCola, alDenegar }: {
  despacho: Pendiente; zonas: ZonaProgramacion[]; alCerrar: () => void; alActualizarCola: () => void; alDenegar: () => void;
}) {
  const cliente = useClienteApi();
  const cargar = useCallback((signal: AbortSignal) => consultarDisponibles(cliente, signal), [cliente]);
  const consulta = useLecturaProgramacion(cargar);
  const [seleccion, establecerSeleccion] = useState('');
  const [busqueda, establecerBusqueda] = useState('');
  const [observacion, establecerObservacion] = useState('');
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState<ErrorProgramacion | null>(null);
  const enCurso = useRef(false);
  const vigente = useRef(true);
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
  useEffect(() => { establecerSeleccion(''); }, [consulta.datos]);
  useEffect(() => { if (consulta.error?.permiso) alDenegar(); }, [consulta.error, alDenegar]);
  useVigenciaProgramacion(consulta.actualizar, !guardando && !error?.incierto && !error?.estado);
  const repartidores = consulta.datos ?? [];
  const elegido = repartidores.find((r) => r.idRepartidor === seleccion);
  const conflicto = error?.estado === 409;
  const bloqueada = guardando || consulta.cargando || Boolean(consulta.error) || conflicto || Boolean(error?.incierto);
  const confirmar = async () => {
    if (enCurso.current || bloqueada || !elegido || dimensionesExcedidas(elegido, despacho).length || observacion.length > 250) return;
    enCurso.current = true;
    establecerGuardando(true);
    establecerError(null);
    try {
      const respuesta = await asignarDespacho(cliente, despacho.idDespacho, { idRepartidor: elegido.idRepartidor, idJornada: elegido.idJornada,
        ...(observacion.trim() ? { observacion: observacion.trim() } : {}) });
      if (!vigente.current) return;
      notificarOperacion({ id: `asignacion-${despacho.idDespacho}`, tipo: 'exito',
        mensaje: `Despacho ${despacho.codigoOperativo} asignado a ${elegido.nombre} (Parada #${respuesta.posicionSecuencia}).` });
      alActualizarCola();
    } catch (fallo) {
      if (!vigente.current) return;
      const interpretado = interpretarError(fallo, true);
      if (interpretado.permiso) alDenegar();
      else {
        establecerError(interpretado); establecerSeleccion('');
        if (interpretado.estado === 422) consulta.actualizar();
      }
    } finally {
      enCurso.current = false;
      if (vigente.current) establecerGuardando(false);
    }
  };
  const visibles = repartidores.filter((r) => `${r.nombre} ${r.idRepartidor}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')));
  function tarjeta(repartidor: RepartidorDisponible) {
    const excesos = dimensionesExcedidas(repartidor, despacho);
    const libre = repartidor.capacidadRemanente;
    return <TarjetaRepartidor key={repartidor.idRepartidor} idRepartidor={repartidor.idRepartidor} nombre={repartidor.nombre}
      placa="Vehículo no informado" zona={zonas.find((z) => z.id === repartidor.idZona)?.nombre ?? repartidor.idZona} estadoOperativo={repartidor.estadoOperativo}
      seleccionada={seleccion === repartidor.idRepartidor} disabled={bloqueada || excesos.length > 0}
      motivoDeshabilitado={excesos.length ? `Capacidad de carga del repartidor excedida: ${excesos.join(', ')}.` : undefined}
      alSeleccionar={(id) => { establecerSeleccion(id); establecerError(null); }}
      detalleCapacidad={<div className={clases.capacidad}>{[
        ['Peso', `${formatoNumero.format(libre.pesoKg)} kg`, `${formatoNumero.format(despacho.pesoTotalKg)} kg`],
        ['Volumen', `${formatoNumero.format(libre.volumenM3)} m³`, `${formatoNumero.format(despacho.volumenTotalM3)} m³`],
        ['Paquetes', String(libre.paquetes), String(despacho.cantidadPaquetes)],
      ].map(([nombre, disponible, requerido]) => <div key={nombre}><Text size="sm" fw={600}>{nombre}</Text>
        <Text size="sm">{disponible} libres</Text><Text size="xs" c="dimmed">Carga propuesta: {requerido}</Text></div>)}</div>} />;
  }
  return <Modal opened onClose={alCerrar} size={880} radius="lg" title={`Asignar despacho ${despacho.codigoOperativo}`}
    classNames={{ content: clases.modal, title: clases.tituloModal, header: clases.cabeceraModal, body: clases.cuerpoModal }} closeOnEscape={!guardando} closeOnClickOutside={!guardando} withCloseButton={!guardando}
    returnFocus={false} closeButtonProps={{ 'aria-label': 'Cerrar asignación' }}>
    <Stack gap="lg">
      <ResumenDespacho despacho={despacho} />
      <TextInput label="Buscar repartidor" placeholder="Nombre o identificador" value={busqueda} disabled={guardando}
        onChange={(e) => establecerBusqueda(e.currentTarget.value)} leftSection={<IconSearch size={20} aria-hidden="true" />} />
      {consulta.cargando ? <Stack aria-label="Cargando repartidores">{[0, 1, 2].map((i) => <Skeleton key={i} height={144} />)}</Stack>
        : consulta.error ? <EstadoVista estado="error" descripcion={consulta.error.mensaje} accion={{ id: 'reintentar', etiqueta: 'Reintentar repartidores' }} alAccionar={consulta.actualizar} />
        : repartidores.length === 0 ? <Stack><EstadoVista estado="vacio" titulo="No hay repartidores disponibles en este momento" />
          <Anchor component={Link} to="/repartidores">Ir al catálogo de repartidores</Anchor></Stack>
        : visibles.length === 0 ? <EstadoVista estado="sinResultados" accion={{ id: 'limpiar', etiqueta: 'Limpiar búsqueda' }} alAccionar={() => establecerBusqueda('')} />
        : <><Text size="xs" c="dimmed">Capacidad remanente confirmada por Operación. Los límites totales y la placa no están incluidos en esta consulta; no se representan porcentajes de ocupación.</Text>
          <Radio.Group label="Repartidor" value={seleccion}>
            <Stack gap="md" className={clases.lista}>{[true, false].map((mismaZona) => {
              const grupo = visibles.filter((r) => (r.idZona === despacho.idZona) === mismaZona);
              return grupo.length > 0 && <Stack key={String(mismaZona)} gap="md">
                <Divider label={<Title order={4} size="md">{mismaZona ? `En la zona ${despacho.nombreZona}` : 'Otras zonas'}</Title>} />
                {grupo.map(tarjeta)}
              </Stack>;
            })}</Stack>
          </Radio.Group></>}
      <Textarea label="Observaciones o instrucciones de entrega" value={observacion} maxLength={250} disabled={guardando}
        onChange={(e) => establecerObservacion(e.currentTarget.value)} description={`${observacion.length}/250 caracteres`} error={error?.campos.observacion} />
      {error && <Alert color={conflicto ? 'yellow.8' : 'red.8'} title={conflicto ? 'Actualiza antes de continuar' : 'No se pudo confirmar la asignación'} role="alert">
        <Text>{error.mensaje}</Text>
        {conflicto || error.incierto ? <Button type="button" variant="outline" mt="sm" onClick={alActualizarCola}>Cerrar y recargar cola</Button>
          : <Button type="button" variant="outline" mt="sm" onClick={() => { establecerSeleccion(''); consulta.actualizar(); }}>Actualizar repartidores</Button>}
      </Alert>}
      <Group justify="flex-end"><Button type="button" variant="outline" disabled={guardando} onClick={alCerrar}>Cancelar</Button>
        <Button type="button" loading={guardando} disabled={bloqueada || !elegido || dimensionesExcedidas(elegido, despacho).length > 0} onClick={confirmar}>Confirmar asignación</Button></Group>
    </Stack>
  </Modal>;
}
