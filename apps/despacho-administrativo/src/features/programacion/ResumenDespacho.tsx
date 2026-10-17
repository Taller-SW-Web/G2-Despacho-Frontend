import { SimpleGrid, Stack, Text } from '@mantine/core';
import { BadgeEstado } from '@despacho/componentes-compartidos';
import { formatearFecha, formatoNumero, type Pendiente } from './modelo';
import clases from './Programacion.module.css';

export function ResumenDespacho({ despacho }: { despacho: Pendiente }) {
  const campos = [
    ['Código de rastreo', despacho.codigoRastreoInterno], ['Pedido', despacho.idPedido], ['Zona', despacho.nombreZona], ['Dirección', despacho.direccion],
    ['Peso', `${formatoNumero.format(despacho.pesoTotalKg)} kg`], ['Volumen', `${formatoNumero.format(despacho.volumenTotalM3)} m³`],
    ['Paquetes', String(despacho.cantidadPaquetes)], ['Fecha programada', formatearFecha(despacho.fechaProgramada)],
    ['Intentos consumidos', String(despacho.numeroIntentos)], ['Tiempo en espera', `${Math.floor(despacho.tiempoEsperaSegundos / 60)} min`],
  ];
  return <Stack gap="md" className={clases.resumen}>
    {despacho.esSimulacion && <span className={clases.simulado}><BadgeEstado contexto="etiqueta" valor="SIMULADO" /></span>}
    {despacho.reintento && <BadgeEstado contexto="etiqueta" valor="REINTENTO" />}
    <SimpleGrid cols={{ base: 2, sm: 4 }}>{campos.map(([etiqueta, valor]) => <div key={etiqueta}>
      <Text size="xs" c="dimmed">{etiqueta}</Text><Text size="sm" fw={500} className="ia-num">{valor}</Text>
    </div>)}</SimpleGrid>
    {!despacho.asignable && <Text size="sm">Disponible desde {formatearFecha(despacho.disponibleDesde ?? despacho.fechaProgramada)}.</Text>}
  </Stack>;
}
