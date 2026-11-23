import { useEffect, useState } from 'react';
import { ActionIcon, Button, Group, Menu, Text } from '@mantine/core';
import { IconDots, IconLink, IconUserOff } from '@tabler/icons-react';
import { BadgeEstado, type ColumnaDatos } from '@despacho/componentes-compartidos';
import { listarRepartidores } from './api';
import { etiquetasTurno, registros, turnos, vinculaciones, type Repartidor } from './modelo';
import { useCatalogoFlota, type DefinicionFiltro } from './useCatalogoFlota';
import { CatalogoFlota } from './CatalogoFlota';
import { FormularioRepartidor } from './FormularioRepartidor';
import { VinculacionRepartidor } from './VinculacionRepartidor';
import { ConfirmacionEstadoFlota } from './ConfirmacionEstadoFlota';
import { useVersionSesion } from '../../sesion/useVersionSesion';
import clases from './CatalogoFlota.module.css';

const definiciones: DefinicionFiltro[] = [
  { clave: 'estadoRegistro', etiqueta: 'Registro', opciones: registros },
  { clave: 'estadoVinculacion', etiqueta: 'Vinculación', opciones: vinculaciones },
  { clave: 'turnoHabitual', etiqueta: 'Turno habitual', opciones: turnos },
];
type Seleccion =
  { tipo: 'nuevo' } | { tipo: 'editar' | 'baja' | 'vincular'; repartidor: Repartidor };

export function PaginaRepartidores() {
  const sesion = useVersionSesion();
  return <PanelRepartidores key={sesion} />;
}

function PanelRepartidores() {
  const consulta = useCatalogoFlota(listarRepartidores, definiciones);
  const [seleccion, establecerSeleccion] = useState<Seleccion | null>(null);
  useEffect(() => {
    if (consulta.denegado) establecerSeleccion(null);
  }, [consulta.denegado]);
  const cerrar = () => {
    establecerSeleccion(null);
    consulta.actualizar();
  };
  const columnas: ColumnaDatos<Repartidor>[] = [
    {
      id: 'nombre',
      encabezado: 'Repartidor y contacto',
      celda: (fila) => (
        <div className={clases.persona}>
          <Text size="sm" fw={600}>
            {fila.nombres} {fila.apellidos}
          </Text>
          <Text size="xs" className={clases.correo}>
            {fila.correo}
          </Text>
          <Text size="xs" className={`${clases.correo} ${clases.codigo}`}>
            Tel. {fila.telefono}
          </Text>
        </div>
      ),
    },
    {
      id: 'dni',
      encabezado: 'DNI',
      celda: (fila) => <span className={clases.codigo}>{fila.dni}</span>,
    },
    {
      id: 'brevete',
      encabezado: 'Brevete',
      celda: (fila) => <span className={clases.codigo}>{fila.numeroBrevete}</span>,
    },
    {
      id: 'turno',
      encabezado: 'Turno',
      celda: (fila) => (
        <span className={clases.sinSalto}>
          {Object.hasOwn(etiquetasTurno, fila.turnoHabitual)
            ? etiquetasTurno[fila.turnoHabitual]
            : 'Turno no disponible'}
        </span>
      ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      celda: (fila) => (
        <div className={clases.estados}>
          <BadgeEstado contexto="registro" valor={fila.estadoRegistro} />
          <BadgeEstado contexto="vinculacion" valor={fila.estadoVinculacion} />
        </div>
      ),
    },
    {
      id: 'acciones',
      encabezado: 'Acciones',
      celda: (fila) => (
        <Group gap="xs" className={clases.acciones}>
          <Button
            type="button"
            variant="subtle"
            size="sm"
            mih={44}
            disabled={!consulta.confirmada}
            aria-label={`Editar repartidor ${fila.nombres} ${fila.apellidos}`}
            onClick={() => establecerSeleccion({ tipo: 'editar', repartidor: fila })}
          >
            Editar
          </Button>
          {fila.estadoRegistro === 'ACTIVO' && (
            <Menu position="bottom-end" returnFocus>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  size={44}
                  disabled={!consulta.confirmada}
                  aria-label={`Más acciones para ${fila.nombres} ${fila.apellidos}`}
                >
                  <IconDots size={20} aria-hidden="true" />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  mih={44}
                  disabled={
                    fila.estadoRegistro !== 'ACTIVO' || fila.estadoVinculacion !== 'PENDIENTE'
                  }
                  leftSection={<IconLink size={16} aria-hidden="true" />}
                  onClick={() => establecerSeleccion({ tipo: 'vincular', repartidor: fila })}
                >
                  Vincular cuenta
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  mih={44}
                  color="red"
                  disabled={fila.estadoRegistro !== 'ACTIVO'}
                  leftSection={<IconUserOff size={16} aria-hidden="true" />}
                  onClick={() => establecerSeleccion({ tipo: 'baja', repartidor: fila })}
                >
                  Dar de baja
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      ),
    },
  ];
  return (
    <CatalogoFlota
      titulo="Repartidores"
      subtitulo="Administra perfiles locales y su vinculación con cuentas de Seguridad."
      etiquetaNuevo="Nuevo repartidor"
      consulta={consulta}
      definiciones={definiciones}
      columnas={columnas}
      anchoMinimo={960}
      obtenerId={(fila) => fila.idRepartidor}
      alNuevo={() => establecerSeleccion({ tipo: 'nuevo' })}
      estiloFila={(fila) =>
        fila.estadoRegistro === 'INACTIVO'
          ? {
              background: 'var(--ia-color-surface-cloud-subtle)',
              color: 'var(--ia-color-text-secondary)',
            }
          : {}
      }
    >
      {seleccion && (seleccion.tipo === 'nuevo' || seleccion.tipo === 'editar') && (
        <FormularioRepartidor
          repartidor={seleccion.tipo === 'editar' ? seleccion.repartidor : undefined}
          cliente={consulta.cliente}
          alCerrar={cerrar}
          alGuardar={cerrar}
          alDenegar={consulta.denegar}
        />
      )}
      {seleccion?.tipo === 'vincular' && (
        <VinculacionRepartidor
          repartidor={seleccion.repartidor}
          cliente={consulta.cliente}
          alCerrar={cerrar}
          alGuardar={cerrar}
          alDenegar={consulta.denegar}
        />
      )}
      {seleccion?.tipo === 'baja' && (
        <ConfirmacionEstadoFlota
          recurso={{ tipo: 'repartidor', valor: seleccion.repartidor }}
          cliente={consulta.cliente}
          alCerrar={cerrar}
          alGuardar={cerrar}
          alDenegar={consulta.denegar}
        />
      )}
    </CatalogoFlota>
  );
}
