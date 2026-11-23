import { useEffect, useState } from 'react';
import { Button, Group, Text } from '@mantine/core';
import { BadgeEstado, type ColumnaDatos } from '@despacho/componentes-compartidos';
import { listarFurgonetas } from './api';
import { estadosFurgoneta, transicionesFurgoneta, type Furgoneta } from './modelo';
import { useCatalogoFlota, type DefinicionFiltro } from './useCatalogoFlota';
import { CatalogoFlota } from './CatalogoFlota';
import { FormularioFurgoneta } from './FormularioFurgoneta';
import { ConfirmacionEstadoFlota } from './ConfirmacionEstadoFlota';
import { useVersionSesion } from '../../sesion/useVersionSesion';
import clases from './CatalogoFlota.module.css';

const definiciones: DefinicionFiltro[] = [
  { clave: 'estado', etiqueta: 'Estado', opciones: estadosFurgoneta },
  { clave: 'placa', etiqueta: 'Placa', maximoCaracteres: 10 },
];
const numero = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 4 });
type Seleccion = { tipo: 'nuevo' } | { tipo: 'editar' | 'estado'; furgoneta: Furgoneta };
export function PaginaFurgonetas() {
  const sesion = useVersionSesion();
  return <PanelFurgonetas key={sesion} />;
}

function PanelFurgonetas() {
  const consulta = useCatalogoFlota(listarFurgonetas, definiciones);
  const [seleccion, establecerSeleccion] = useState<Seleccion | null>(null);
  useEffect(() => {
    if (consulta.denegado) establecerSeleccion(null);
  }, [consulta.denegado]);
  const cerrar = () => {
    establecerSeleccion(null);
    consulta.actualizar();
  };
  const columnas: ColumnaDatos<Furgoneta>[] = [
    {
      id: 'placa',
      encabezado: 'Placa',
      celda: (fila) => (
        <Text size="sm" fw={600} className={clases.codigo}>
          {fila.placa}
        </Text>
      ),
    },
    {
      id: 'peso',
      encabezado: 'Límite de peso',
      alineacion: 'right',
      celda: (fila) => (
        <span className={clases.codigo}>{numero.format(fila.capacidadPesoKg)} kg</span>
      ),
    },
    {
      id: 'volumen',
      encabezado: 'Límite de volumen',
      alineacion: 'right',
      celda: (fila) => (
        <span className={clases.codigo}>{numero.format(fila.capacidadVolumenM3)} m³</span>
      ),
    },
    {
      id: 'paquetes',
      encabezado: 'Máx. de paquetes',
      alineacion: 'right',
      celda: (fila) => (
        <span className={clases.codigo}>{numero.format(fila.maximoPaquetes)} paq.</span>
      ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      celda: (fila) => (
        <span className={clases.sinSalto}>
          <BadgeEstado contexto="vehiculo" valor={fila.estado} />
        </span>
      ),
    },
    {
      id: 'acciones',
      encabezado: 'Acciones',
      celda: (fila) => (
        <Group gap="xs" className={clases.acciones}>
          <Button
            type="button"
            size="sm"
            variant="subtle"
            mih={44}
            disabled={!consulta.confirmada}
            aria-label={`Editar furgoneta ${fila.placa}`}
            onClick={() => establecerSeleccion({ tipo: 'editar', furgoneta: fila })}
          >
            Editar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="subtle"
            mih={44}
            disabled={!consulta.confirmada || !transicionesFurgoneta(fila.estado).length}
            aria-label={`Cambiar estado de ${fila.placa}`}
            onClick={() => establecerSeleccion({ tipo: 'estado', furgoneta: fila })}
          >
            Cambiar estado
          </Button>
        </Group>
      ),
    },
  ];
  return (
    <CatalogoFlota
      titulo="Furgonetas"
      subtitulo="Administra los vehículos, sus límites de carga y su estado de registro."
      etiquetaNuevo="Nueva furgoneta"
      consulta={consulta}
      definiciones={definiciones}
      columnas={columnas}
      anchoMinimo={760}
      obtenerId={(fila) => fila.idFurgoneta}
      alNuevo={() => establecerSeleccion({ tipo: 'nuevo' })}
    >
      {seleccion && (seleccion.tipo === 'nuevo' || seleccion.tipo === 'editar') && (
        <FormularioFurgoneta
          furgoneta={seleccion.tipo === 'editar' ? seleccion.furgoneta : undefined}
          cliente={consulta.cliente}
          alCerrar={cerrar}
          alGuardar={cerrar}
          alDenegar={consulta.denegar}
        />
      )}
      {seleccion?.tipo === 'estado' && (
        <ConfirmacionEstadoFlota
          recurso={{ tipo: 'furgoneta', valor: seleccion.furgoneta }}
          cliente={consulta.cliente}
          alCerrar={cerrar}
          alGuardar={cerrar}
          alDenegar={consulta.denegar}
        />
      )}
    </CatalogoFlota>
  );
}
