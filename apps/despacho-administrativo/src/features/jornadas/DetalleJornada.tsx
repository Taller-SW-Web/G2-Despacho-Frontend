import { useCallback, useEffect } from 'react';
import { Button, Loader, Modal, Stack, Text } from '@mantine/core';
import { BadgeEstado, EstadoVista, TablaDatos } from '@despacho/componentes-compartidos';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { consultarDetalle } from './api';
import { useConsultaJornadas } from './useConsultaJornadas';
import { MetricasJornada } from './MetricasJornada';

export function DetalleJornada({ cliente, id, alCerrar, alDenegar }: { cliente: ClienteApi; id: string; alCerrar: () => void; alDenegar: () => void }) {
  const cargar = useCallback((signal: AbortSignal) => consultarDetalle(cliente, id, signal), [cliente, id]);
  const consulta = useConsultaJornadas(cargar);
  useEffect(() => { if (consulta.denegado) alDenegar(); }, [consulta.denegado, alDenegar]);
  const jornada = consulta.datos;
  return <Modal opened title="Detalle de jornada" size="xl" onClose={alCerrar} centered><Stack gap="md">
    <EstadoVista estado={consulta.denegado ? 'sinPermiso' : !jornada && consulta.cargando ? 'carga' : consulta.error ? 'error' : 'datos'} esqueleto={<Loader aria-label="Cargando jornada" />}
      accion={{ id: 'actualizar', etiqueta: 'Reintentar detalle' }} alAccionar={consulta.actualizar}>
      {jornada && <Stack gap="lg">
        <Text>Furgoneta {jornada.placa} · {jornada.fecha} · {jornada.estado}</Text>
        <Text size="sm">Zona: {jornada.idZona}</Text>
        <MetricasJornada jornada={jornada} />
        <Text>Remanente: {jornada.capacidadRemanente.pesoKg} kg · {jornada.capacidadRemanente.volumenM3} m³ · {jornada.capacidadRemanente.paquetes} paquetes</Text>
        {jornada.cerradaEn && <Text>Cierre: {new Date(jornada.cerradaEn).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</Text>}
        <TablaDatos filas={jornada.despachos} obtenerId={(fila) => fila.idDespacho} tituloAccesible="Despachos proyectados de la jornada"
          estado={jornada.despachos.length ? 'datos' : 'vacio'} anchoMinimo={550} columnas={[
            { id: 'id', encabezado: 'Despacho', celda: (fila) => fila.idDespacho },
            { id: 'secuencia', encabezado: 'Secuencia', celda: (fila) => fila.secuenciaRuta ?? 'Sin secuencia' },
            { id: 'estado', encabezado: 'Estado', celda: (fila) => <BadgeEstado contexto="despacho" valor={fila.estado} /> },
          ]} />
      </Stack>}
    </EstadoVista>
    <Button variant="outline" onClick={alCerrar}>Volver al monitoreo</Button>
  </Stack></Modal>;
}
