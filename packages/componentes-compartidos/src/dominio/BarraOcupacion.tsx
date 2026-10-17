import { useId } from 'react';
import { Group, Progress, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react';
import clases from './BarraOcupacion.module.css';

export type PropiedadesBarraOcupacion = {
  metrica: 'peso' | 'volumen' | 'paquetes';
  usado: number;
  limite: number;
  /** Total resultante, no incremento. */
  proyeccion?: number;
  variante?: 'completa' | 'compacta';
};

const metricas = {
  peso: { etiqueta: 'Peso', unidad: 'kg' },
  volumen: { etiqueta: 'Volumen', unidad: 'm³' },
  paquetes: { etiqueta: 'Paquetes', unidad: 'paquetes' },
};
const formatoNumero = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 20 });
const nivel = (porcentaje: number) => porcentaje < 70 ? 'Normal' : porcentaje < 100 ? 'Alta' : 'Llena';
const colorNivel = (porcentaje: number) => porcentaje < 70 ? 'green.8' : porcentaje < 100 ? 'yellow.8' : 'red.8';
const recortar = (porcentaje: number) => Math.min(100, Math.max(0, porcentaje));

function formatearPorcentaje(porcentaje: number) {
  // La precisión aumenta solo cuando redondear cruzaría un umbral de nivel.
  let decimales = 1;
  while (decimales < 20 && nivel(Number(porcentaje.toFixed(decimales))) !== nivel(porcentaje)) decimales++;
  return new Intl.NumberFormat('es-PE', { maximumFractionDigits: decimales }).format(porcentaje);
}

/** CR-11: visualización requerida por CR-20; no decide compatibilidad ni autorización. */
export function BarraOcupacion({ metrica, usado, limite, proyeccion, variante = 'completa' }: PropiedadesBarraOcupacion) {
  const id = useId();
  const { etiqueta, unidad } = metricas[metrica];
  const porcentaje = usado / limite * 100;
  const valida = Number.isFinite(usado) && usado >= 0 && Number.isFinite(limite) && limite > 0 && Number.isFinite(porcentaje);
  if (!valida) return <Text size="sm">{etiqueta}: Capacidad no disponible</Text>;

  const porcentajeProyectado = proyeccion === undefined ? undefined : proyeccion / limite * 100;
  const proyeccionValida = proyeccion !== undefined && Number.isFinite(proyeccion) && proyeccion >= 0 && Number.isFinite(porcentajeProyectado);
  const valores = `${formatoNumero.format(usado)} / ${formatoNumero.format(limite)} ${unidad} (${formatearPorcentaje(porcentaje)} %)`;
  const textoActual = `${etiqueta}: ${valores}, nivel ${nivel(porcentaje)}`;
  const textoProyeccion = proyeccionValida
    ? `Proyección: ${formatoNumero.format(proyeccion!)} / ${formatoNumero.format(limite)} ${unidad} (${formatearPorcentaje(porcentajeProyectado!)} %), nivel ${nivel(porcentajeProyectado!)}`
    : proyeccion !== undefined ? 'Proyección no disponible' : '';
  const exceso = Math.max(usado, proyeccionValida ? proyeccion! : usado) - limite;
  const textoExceso = exceso > 0 ? `Excede en ${formatoNumero.format(exceso)} ${unidad}` : '';
  const Icono = porcentaje >= 100 ? IconAlertCircle : porcentaje >= 70 ? IconAlertTriangle : null;

  return <Stack gap="xs" className={clases.raiz} data-variante={variante}>
    <Group gap="sm" justify="space-between" className={clases.etiquetas}>
      <Text id={`${id}-etiqueta`} size="sm" fw={600}>{etiqueta}</Text>
      <Text size="sm" className="ia-num">{valores}</Text>
      <Group gap="xs" wrap="nowrap">
        {Icono && <Icono size={16} aria-hidden="true" />}
        <Text size="sm" fw={porcentaje >= 100 ? 600 : 400}>{nivel(porcentaje)}</Text>
      </Group>
    </Group>
    <Progress.Root size={variante === 'compacta' ? 4 : 8} radius="xs" bg="cloud.2"
      role="progressbar" aria-labelledby={`${id}-etiqueta`} aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={recortar(porcentaje)} aria-valuetext={[textoActual, textoProyeccion, textoExceso].filter(Boolean).join('. ')}>
      <Progress.Section value={recortar(porcentaje)} color={colorNivel(porcentaje)} withAria={false} />
      {proyeccionValida && porcentajeProyectado! > porcentaje && <Progress.Section
        value={Math.max(0, recortar(porcentajeProyectado!) - recortar(porcentaje))}
        color={colorNivel(porcentajeProyectado!)} striped withAria={false} />}
    </Progress.Root>
    {textoProyeccion && <Text size="sm" className="ia-num">{textoProyeccion}</Text>}
    {textoExceso && <Group gap="xs" wrap="nowrap">
      <IconAlertCircle size={16} aria-hidden="true" />
      <Text size="sm" fw={600} className="ia-num">{textoExceso}</Text>
    </Group>}
  </Stack>;
}
