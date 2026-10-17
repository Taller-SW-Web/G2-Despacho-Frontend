import { useEffect, useState } from 'react';
import { Button, Group } from '@mantine/core';
import { BadgeEstado, type ColumnaDatos } from '@despacho/componentes-compartidos';
import { listarFurgonetas } from './api';
import { estadosFurgoneta, transicionesFurgoneta, type Furgoneta } from './modelo';
import { useCatalogoFlota, type DefinicionFiltro } from './useCatalogoFlota';
import { CatalogoFlota } from './CatalogoFlota';
import { FormularioFurgoneta } from './FormularioFurgoneta';
import { ConfirmacionEstadoFlota } from './ConfirmacionEstadoFlota';

const definiciones: DefinicionFiltro[] = [{ clave: 'estado', etiqueta: 'Estado', opciones: estadosFurgoneta }, { clave: 'placa', etiqueta: 'Placa', maximoCaracteres: 10 }];
const numero = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 4 });
type Seleccion = { tipo: 'nuevo' } | { tipo: 'editar' | 'estado'; furgoneta: Furgoneta };
export function PaginaFurgonetas() {
  const consulta = useCatalogoFlota(listarFurgonetas, definiciones);
  const [seleccion, establecerSeleccion] = useState<Seleccion | null>(null);
  useEffect(() => { if (consulta.denegado) establecerSeleccion(null); }, [consulta.denegado]);
  const cerrar = () => { establecerSeleccion(null); consulta.actualizar(); };
  const columnas: ColumnaDatos<Furgoneta>[] = [
    { id: 'placa', encabezado: 'Placa', celda: (fila) => fila.placa },
    { id: 'peso', encabezado: 'Límite de peso (kg)', alineacion: 'right', celda: (fila) => numero.format(fila.capacidadPesoKg) },
    { id: 'volumen', encabezado: 'Límite de volumen (m³)', alineacion: 'right', celda: (fila) => numero.format(fila.capacidadVolumenM3) },
    { id: 'paquetes', encabezado: 'Máximo de paquetes', alineacion: 'right', celda: (fila) => numero.format(fila.maximoPaquetes) },
    { id: 'estado', encabezado: 'Estado', celda: (fila) => <BadgeEstado contexto="vehiculo" valor={fila.estado} /> },
    { id: 'acciones', encabezado: 'Acciones', celda: (fila) => <Group gap="xs" wrap="nowrap">
      <Button type="button" size="sm" variant="subtle" mih={44} disabled={!consulta.confirmada} aria-label={`Editar furgoneta ${fila.placa}`}
        onClick={() => establecerSeleccion({ tipo: 'editar', furgoneta: fila })}>Editar</Button>
      <Button type="button" size="sm" variant="subtle" mih={44} disabled={!consulta.confirmada || !transicionesFurgoneta(fila.estado).length}
        aria-label={`Cambiar estado de ${fila.placa}`} onClick={() => establecerSeleccion({ tipo: 'estado', furgoneta: fila })}>Cambiar estado</Button>
    </Group> },
  ];
  return <CatalogoFlota titulo="Furgonetas" subtitulo="Administra los vehículos, sus límites de carga y su estado de registro." etiquetaNuevo="Nueva furgoneta"
    consulta={consulta} definiciones={definiciones} columnas={columnas} obtenerId={(fila) => fila.idFurgoneta} alNuevo={() => establecerSeleccion({ tipo: 'nuevo' })}>
    {seleccion && (seleccion.tipo === 'nuevo' || seleccion.tipo === 'editar') && <FormularioFurgoneta furgoneta={seleccion.tipo === 'editar' ? seleccion.furgoneta : undefined}
      cliente={consulta.cliente} alCerrar={cerrar} alGuardar={cerrar} alDenegar={consulta.denegar} />}
    {seleccion?.tipo === 'estado' && <ConfirmacionEstadoFlota recurso={{ tipo: 'furgoneta', valor: seleccion.furgoneta }} cliente={consulta.cliente}
      alCerrar={cerrar} alGuardar={cerrar} alDenegar={consulta.denegar} />}
  </CatalogoFlota>;
}
