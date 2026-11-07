import { useCallback, useRef, useState } from 'react';
import { Alert, Button, Divider, Group, Modal, Radio, Skeleton, Stack, Text, Title } from '@mantine/core';
import { EstadoVista, notificarOperacion, TarjetaRepartidor } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarZonas } from '../programacion/api';
import type { RepartidorDisponible } from '../programacion/modelo';
import { useLecturaProgramacion } from '../programacion/useLecturaProgramacion';
import { asignarRecojo, consultarJornadasRecojo, interpretarErrorRecojo } from './api';
import type { Recojo } from './modelo';

/** ES-F02-09 UI-03: misma lógica que una entrega; primero la zona del recojo y después las demás. */
export function ModalAsignarRecojo({ recojo, alCerrar, alAsignar }: { recojo: Recojo; alCerrar: () => void; alAsignar: () => void }) {
  const cliente = useClienteApi();
  const cargar = useCallback(async (signal: AbortSignal) => {
    const [repartidores, zonas] = await Promise.all([consultarJornadasRecojo(cliente, signal), consultarZonas(cliente, signal)]);
    return { repartidores, zonas };
  }, [cliente]);
  const consulta = useLecturaProgramacion(cargar);
  const [seleccion, seleccionar] = useState('');
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState<string | null>(null);
  // La misma clave en un reintento devuelve el resultado original; un rechazo definitivo usa otra.
  const clave = useRef(crypto.randomUUID());
  const repartidores = consulta.datos?.repartidores ?? [];
  const zonas = consulta.datos?.zonas ?? [];
  const elegido = repartidores.find((r) => r.idRepartidor === seleccion);
  const excede = (r: RepartidorDisponible) => [recojo.pesoKg > r.capacidadRemanente.pesoKg && 'peso', recojo.volumenM3 > r.capacidadRemanente.volumenM3 && 'volumen',
    recojo.cantidadPaquetes > r.capacidadRemanente.paquetes && 'paquetes'].filter(Boolean) as string[];
  const confirmar = async () => {
    if (!elegido || guardando) return;
    establecerGuardando(true); establecerError(null);
    try {
      const resultado = await asignarRecojo(cliente, recojo, clave.current, { idRepartidor: elegido.idRepartidor, idJornada: elegido.idJornada });
      notificarOperacion({ id: `asignacion-recojo-${recojo.idRecojo}`, tipo: 'exito', mensaje: `Recojo ${recojo.codigoRastreoInterno} asignado a ${elegido.nombre} (Parada #${resultado.secuenciaRuta}).` });
      alAsignar();
    } catch (fallo) {
      const interpretado = interpretarErrorRecojo(fallo, true);
      if (!interpretado.incierto) clave.current = crypto.randomUUID();
      establecerError(interpretado.mensaje); establecerGuardando(false); seleccionar('');
      if (interpretado.estado === 422 || interpretado.estado === 409) consulta.actualizar();
    }
  };
  const tarjeta = (r: RepartidorDisponible) => {
    const excesos = excede(r);
    const proyectar = seleccion === r.idRepartidor || excesos.length > 0;
    return <TarjetaRepartidor key={r.idRepartidor} idRepartidor={r.idRepartidor} nombre={r.nombre} placa={r.placa}
      zona={zonas.find((z) => z.id === r.idZona)?.nombre ?? r.idZona} estadoOperativo={r.estadoOperativo} seleccionada={seleccion === r.idRepartidor}
      disabled={guardando || excesos.length > 0} motivoDeshabilitado={excesos.length ? `Capacidad de carga del repartidor excedida: ${excesos.join(', ')}.` : undefined}
      alSeleccionar={(id) => { seleccionar(id); establecerError(null); }}
      metricas={[
        { metrica: 'peso', usado: r.ocupacion.pesoKg, limite: r.limites.pesoKg, proyeccion: proyectar ? r.ocupacion.pesoKg + recojo.pesoKg : undefined },
        { metrica: 'volumen', usado: r.ocupacion.volumenM3, limite: r.limites.volumenM3, proyeccion: proyectar ? r.ocupacion.volumenM3 + recojo.volumenM3 : undefined },
        { metrica: 'paquetes', usado: r.ocupacion.paquetes, limite: r.limites.paquetes, proyeccion: proyectar ? r.ocupacion.paquetes + recojo.cantidadPaquetes : undefined },
      ]} />;
  };
  return <Modal opened onClose={alCerrar} size={880} radius="lg" title={`Asignar recojo ${recojo.codigoRastreoInterno}`} closeOnEscape={!guardando} closeOnClickOutside={!guardando}>
    <Stack gap="lg">
      <Text>{recojo.direccion}, {recojo.distrito} · {recojo.lineas.map((l) => `${l.cantidad} × ${l.sku}`).join(', ')}</Text>
      {consulta.cargando ? <Stack aria-label="Cargando repartidores">{[0, 1].map((i) => <Skeleton key={i} height={144} />)}</Stack>
        : consulta.error ? <EstadoVista estado="error" descripcion={consulta.error.mensaje} accion={{ id: 'reintentar', etiqueta: 'Reintentar repartidores' }} alAccionar={consulta.actualizar} />
        : repartidores.length === 0 ? <EstadoVista estado="vacio" titulo="No hay jornadas de recojos con capacidad" descripcion="Abre una jornada de tipo Recojos en Monitoreo de flota." />
        : <Radio.Group label="Repartidor" value={seleccion}><Stack gap="md">{[true, false].map((mismaZona) => {
            const grupo = repartidores.filter((r) => (r.idZona === recojo.idZona) === mismaZona);
            return grupo.length > 0 && <Stack key={String(mismaZona)} gap="md">
              <Divider label={<Title order={4} size="md">{mismaZona ? 'En la zona del recojo' : 'Otras zonas'}</Title>} />
              {grupo.map(tarjeta)}
            </Stack>;
          })}</Stack></Radio.Group>}
      {error && <Alert color="red" role="alert" title="No se pudo confirmar la asignación">{error}</Alert>}
      <Group justify="flex-end">
        <Button type="button" variant="outline" disabled={guardando} onClick={alCerrar}>Cancelar</Button>
        <Button type="button" loading={guardando} disabled={!elegido} onClick={() => void confirmar()}>Confirmar asignación</Button>
      </Group>
    </Stack>
  </Modal>;
}
