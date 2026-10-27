import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Group, Modal, Radio, Skeleton, Stack, Text, Textarea } from '@mantine/core';
import { EstadoVista, notificarOperacion, TarjetaRepartidor } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarCandidatosReasignacion, interpretarReasignacion, reasignarDespacho, type CandidatoReasignacion, type ComandoReasignacion } from './reasignacionApi';
import type { ParadaRuta } from './rutasApi';
import { useLecturaProgramacion, useVigenciaProgramacion } from './useLecturaProgramacion';
import { formatoNumero } from './modelo';
import clases from './Programacion.module.css';

export function ModalReasignacionDespacho({ despacho, jornada, conductorActual, alCerrar, alActualizar, alDenegar }: {
  despacho: ParadaRuta; jornada: string; conductorActual: string; alCerrar: () => void; alActualizar: () => void;
  alDenegar: () => void;
}) {
  const cliente = useClienteApi();
  const cargar = useCallback((signal: AbortSignal) => consultarCandidatosReasignacion(cliente, signal), [cliente]);
  const consulta = useLecturaProgramacion(cargar);
  const [seleccion, establecerSeleccion] = useState('');
  const [motivo, establecerMotivo] = useState('');
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState<ReturnType<typeof interpretarReasignacion> | null>(null);
  const comando = useRef<ComandoReasignacion | null>(null);
  const enCurso = useRef(false);
  const vigente = useRef(true);
  const incierto = Boolean(error?.incierto);
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
  useEffect(() => { if (consulta.error?.permiso) alDenegar(); }, [consulta.error, alDenegar]);
  useEffect(() => { if (!incierto) establecerSeleccion(''); }, [consulta.datos, incierto]);
  useVigenciaProgramacion(consulta.actualizar, !guardando && !incierto);
  const candidatos = (consulta.datos ?? []).filter((r) => r.idRepartidor !== despacho.idRepartidor && r.idJornada !== jornada);
  const elegido = candidatos.find((r) => r.idRepartidor === seleccion);
  const excesos = (r: CandidatoReasignacion) => [despacho.pesoKg > r.capacidadRemanente.pesoKg && 'peso',
    despacho.volumenM3 > r.capacidadRemanente.volumenM3 && 'volumen', despacho.cantidadPaquetes > r.capacidadRemanente.paquetes && 'paquetes'].filter(Boolean);
  const bloqueada = guardando || incierto;
  const confirmar = async () => {
    if (enCurso.current) return;
    if (!comando.current) {
      if (!elegido || consulta.cargando || consulta.error || excesos(elegido).length || !motivo.trim() || motivo.length > 500) return;
      comando.current = { clave: crypto.randomUUID(), idDespacho: despacho.idDespacho, version: despacho.version,
        solicitud: { idNuevoRepartidor: elegido.idRepartidor, idNuevaJornada: elegido.idJornada, motivo: motivo.trim() } };
    }
    enCurso.current = true; establecerGuardando(true); establecerError(null);
    try {
      await reasignarDespacho(cliente, comando.current);
      if (!vigente.current) return;
      notificarOperacion({ id: `reasignacion-${despacho.idDespacho}`, tipo: 'exito', mensaje: `Despacho ${despacho.codigoOperativo} reasignado.` });
      alActualizar();
    } catch (fallo) {
      if (!vigente.current) return;
      const interpretado = interpretarReasignacion(fallo);
      if (interpretado.permiso) alDenegar();
      else {
        establecerError(interpretado);
        if (!interpretado.incierto) {
          comando.current = null; establecerSeleccion('');
          if (interpretado.estado === 409) {
            notificarOperacion({ id: `reasignacion-conflicto-${despacho.idDespacho}`, tipo: 'informacion', mensaje: 'El despacho o el destino cambiaron. Se actualizó la ruta.' });
            alActualizar();
          } else if (interpretado.estado === 422) consulta.actualizar();
        }
      }
    } finally { enCurso.current = false; if (vigente.current) establecerGuardando(false); }
  };
  return <Modal opened title={`Reasignar despacho ${despacho.codigoOperativo}`} size={880} radius="lg"
    onClose={() => { if (!bloqueada) alCerrar(); }} closeOnEscape={!bloqueada} closeOnClickOutside={!bloqueada} withCloseButton={!bloqueada}
    returnFocus={false} closeButtonProps={{ 'aria-label': 'Cerrar reasignación' }}
    classNames={{ content: clases.modal, title: clases.tituloModal, header: clases.cabeceraModal, body: clases.cuerpoModal }}>
    <Stack gap="lg">
      <div className={clases.resumen}><Text fw={600}>{despacho.codigoRastreoInterno} · Pedido {despacho.idPedido}</Text>
        <Text>{despacho.direccion}</Text><Text>Repartidor actual: {conductorActual} · Parada #{despacho.posicion}</Text>
        <Text size="sm">{formatoNumero.format(despacho.pesoKg)} kg · {formatoNumero.format(despacho.volumenM3)} m³ · {despacho.cantidadPaquetes} paquetes</Text></div>
      {consulta.cargando ? <Skeleton height={150} /> : consulta.error ? <EstadoVista estado="error" descripcion={consulta.error.mensaje}
        accion={{ id: 'reintentar', etiqueta: 'Reintentar repartidores' }} alAccionar={consulta.actualizar} />
        : !candidatos.length ? <EstadoVista estado="vacio" titulo="No hay otros repartidores disponibles" />
        : <Radio.Group label="Nuevo repartidor" value={seleccion}><Stack gap="md" className={clases.lista}>{candidatos.map((r) => {
          const excedidas = excesos(r);
          return <TarjetaRepartidor key={r.idRepartidor} idRepartidor={r.idRepartidor} nombre={r.nombre} placa={r.placa} zona={r.idZona}
            estadoOperativo={r.estadoOperativo} seleccionada={seleccion === r.idRepartidor} disabled={bloqueada || excedidas.length > 0}
            motivoDeshabilitado={excedidas.length ? `Capacidad excedida: ${excedidas.join(', ')}.` : undefined}
            alSeleccionar={(id) => { establecerSeleccion(id); establecerError(null); }} metricas={[
              { metrica: 'peso', usado: r.ocupacion.pesoKg, limite: r.limites.pesoKg, proyeccion: r.ocupacion.pesoKg + despacho.pesoKg },
              { metrica: 'volumen', usado: r.ocupacion.volumenM3, limite: r.limites.volumenM3, proyeccion: r.ocupacion.volumenM3 + despacho.volumenM3 },
              { metrica: 'paquetes', usado: r.ocupacion.paquetes, limite: r.limites.paquetes, proyeccion: r.ocupacion.paquetes + despacho.cantidadPaquetes },
            ]} />;
        })}</Stack></Radio.Group>}
      <Textarea required label="Motivo de la reasignación" value={motivo} maxLength={500} disabled={bloqueada}
        description="El motivo es obligatorio para reasignar" onChange={(e) => establecerMotivo(e.currentTarget.value)} error={error?.campos.motivo} />
      {error && <Alert color="red" title={incierto ? 'Reasignación sin confirmar' : 'No se pudo reasignar'}>
        <Text>{incierto ? 'La transferencia puede estar aceptada. Conservamos la solicitud original; recupera su resultado antes de continuar.' : error.mensaje}</Text>
        {incierto && <Button mt="sm" loading={guardando} onClick={() => { void confirmar(); }}>Recuperar reasignación</Button>}
      </Alert>}
      <Group justify="flex-end"><Button variant="outline" disabled={bloqueada} onClick={alCerrar}>Cancelar</Button>
        <Button loading={guardando} disabled={incierto || consulta.cargando || Boolean(consulta.error) || !elegido || Boolean(elegido && excesos(elegido).length) || !motivo.trim()}
          onClick={() => { void confirmar(); }}>Confirmar reasignación</Button></Group>
    </Stack>
  </Modal>;
}
