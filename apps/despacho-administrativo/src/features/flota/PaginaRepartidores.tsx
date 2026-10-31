import { useEffect, useState } from 'react';
import { Button, Group, Menu, Text } from '@mantine/core';
import { BadgeEstado, type ColumnaDatos } from '@despacho/componentes-compartidos';
import { listarRepartidores } from './api';
import { etiquetasTurno, registros, turnos, vinculaciones, type Repartidor } from './modelo';
import { useCatalogoFlota, type DefinicionFiltro } from './useCatalogoFlota';
import { CatalogoFlota } from './CatalogoFlota';
import { FormularioRepartidor } from './FormularioRepartidor';
import { VinculacionRepartidor } from './VinculacionRepartidor';
import { ConfirmacionEstadoFlota } from './ConfirmacionEstadoFlota';
import { useVersionSesion } from '../../sesion/useVersionSesion';

const definiciones: DefinicionFiltro[] = [
  { clave: 'estadoRegistro', etiqueta: 'Registro', opciones: registros },
  { clave: 'estadoVinculacion', etiqueta: 'Vinculación', opciones: vinculaciones },
  { clave: 'turnoHabitual', etiqueta: 'Turno habitual', opciones: turnos },
];
type Seleccion = { tipo: 'nuevo' } | { tipo: 'editar' | 'baja' | 'vincular'; repartidor: Repartidor };

export function PaginaRepartidores() {
  const sesion = useVersionSesion();
  return <PanelRepartidores key={sesion} />;
}

function PanelRepartidores() {
  const consulta = useCatalogoFlota(listarRepartidores, definiciones);
  const [seleccion, establecerSeleccion] = useState<Seleccion | null>(null);
  useEffect(() => { if (consulta.denegado) establecerSeleccion(null); }, [consulta.denegado]);
  const cerrar = () => { establecerSeleccion(null); consulta.actualizar(); };
  const columnas: ColumnaDatos<Repartidor>[] = [
    { id: 'nombre', encabezado: 'Repartidor', celda: (fila) => <><Text size="sm" fw={600}>{fila.nombres} {fila.apellidos}</Text><Text size="xs" c="dimmed">{fila.correo}</Text></> },
    { id: 'dni', encabezado: 'DNI', celda: (fila) => fila.dni },
    { id: 'telefono', encabezado: 'Teléfono', celda: (fila) => fila.telefono },
    { id: 'brevete', encabezado: 'Brevete', celda: (fila) => fila.numeroBrevete },
    { id: 'turno', encabezado: 'Turno habitual', celda: (fila) => Object.hasOwn(etiquetasTurno, fila.turnoHabitual) ? etiquetasTurno[fila.turnoHabitual] : 'Turno no disponible' },
    { id: 'registro', encabezado: 'Registro', celda: (fila) => <BadgeEstado contexto="registro" valor={fila.estadoRegistro} /> },
    { id: 'vinculacion', encabezado: 'Vinculación', celda: (fila) => <BadgeEstado contexto="vinculacion" valor={fila.estadoVinculacion} /> },
    { id: 'acciones', encabezado: 'Acciones', celda: (fila) => <Group gap="xs" wrap="nowrap">
      <Button type="button" variant="subtle" size="sm" mih={44} disabled={!consulta.confirmada} aria-label={`Editar repartidor ${fila.nombres} ${fila.apellidos}`}
        onClick={() => establecerSeleccion({ tipo: 'editar', repartidor: fila })}>Editar</Button>
      {fila.estadoRegistro === 'ACTIVO' && <Menu position="bottom-end" returnFocus><Menu.Target><Button type="button" variant="subtle" size="sm" mih={44} disabled={!consulta.confirmada}
        aria-label={`Más acciones para ${fila.nombres} ${fila.apellidos}`}>Más acciones</Button></Menu.Target>
        <Menu.Dropdown>
          <Menu.Item mih={44} disabled={fila.estadoRegistro !== 'ACTIVO'} onClick={() => establecerSeleccion({ tipo: 'baja', repartidor: fila })}>Dar de baja</Menu.Item>
          <Menu.Item mih={44} disabled={fila.estadoRegistro !== 'ACTIVO' || fila.estadoVinculacion !== 'PENDIENTE'}
            onClick={() => establecerSeleccion({ tipo: 'vincular', repartidor: fila })}>Vincular cuenta</Menu.Item>
        </Menu.Dropdown>
      </Menu>}
    </Group> },
  ];
  return <CatalogoFlota titulo="Repartidores" subtitulo="Administra perfiles locales y su vinculación con cuentas de Seguridad." etiquetaNuevo="Nuevo repartidor"
    consulta={consulta} definiciones={definiciones} columnas={columnas} obtenerId={(fila) => fila.idRepartidor} alNuevo={() => establecerSeleccion({ tipo: 'nuevo' })}
    estiloFila={(fila) => fila.estadoRegistro === 'INACTIVO' ? { background: 'var(--ia-color-surface-cloud-subtle)', color: 'var(--ia-color-text-secondary)' } : {}}>
    {seleccion && (seleccion.tipo === 'nuevo' || seleccion.tipo === 'editar') && <FormularioRepartidor
      repartidor={seleccion.tipo === 'editar' ? seleccion.repartidor : undefined} cliente={consulta.cliente} alCerrar={cerrar} alGuardar={cerrar} alDenegar={consulta.denegar} />}
    {seleccion?.tipo === 'vincular' && <VinculacionRepartidor repartidor={seleccion.repartidor} cliente={consulta.cliente} alCerrar={cerrar} alGuardar={cerrar} alDenegar={consulta.denegar} />}
    {seleccion?.tipo === 'baja' && <ConfirmacionEstadoFlota recurso={{ tipo: 'repartidor', valor: seleccion.repartidor }} cliente={consulta.cliente} alCerrar={cerrar} alGuardar={cerrar} alDenegar={consulta.denegar} />}
  </CatalogoFlota>;
}
