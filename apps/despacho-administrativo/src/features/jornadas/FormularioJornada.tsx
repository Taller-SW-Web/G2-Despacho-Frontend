import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  List,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { EstadoVista, notificarOperacion } from '@despacho/componentes-compartidos';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { abrirJornada, cargarRecursos } from './api';
import { apertura, fechaLegible } from './modelo';
import { useConsultaJornadas } from './useConsultaJornadas';
import { useMutacionJornada } from './useMutacionJornada';
import modales from '../flota/ModalesFlota.module.css';

export function FormularioJornada({
  cliente,
  fecha,
  alCerrar,
  alGuardar,
  alDenegar,
  habilitada,
}: {
  cliente: ClienteApi;
  fecha: string;
  alCerrar: () => void;
  alGuardar: () => void;
  alDenegar: () => void;
  habilitada: boolean;
}) {
  const cargar = useCallback((signal: AbortSignal) => cargarRecursos(cliente, signal), [cliente]);
  const recursos = useConsultaJornadas(cargar);
  const operacion = useMutacionJornada(alDenegar);
  const [repartidor, seleccionarRepartidor] = useState<string | null>(null);
  const [furgoneta, seleccionarFurgoneta] = useState<string | null>(null);
  const [zona, seleccionarZona] = useState<string | null>(null);
  useEffect(() => {
    if (recursos.denegado) alDenegar();
  }, [recursos.denegado, alDenegar]);
  const datos = apertura.safeParse({
    idRepartidor: repartidor,
    idFurgoneta: furgoneta,
    idZona: zona,
    fecha,
  });
  const cerrado = !habilitada || !recursos.confirmada || operacion.procesando || operacion.incierta;
  return (
    <Modal
      opened
      onClose={() => {
        if (!operacion.procesando) alCerrar();
      }}
      title="Abrir jornada"
      classNames={{ title: modales.titulo }}
      size="lg"
      radius="lg"
      centered
      closeOnClickOutside={false}
      closeOnEscape={!operacion.procesando}
      closeButtonProps={{
        disabled: operacion.procesando,
        'aria-label': 'Cerrar formulario de jornada',
      }}
    >
      <form
        noValidate
        aria-busy={operacion.procesando}
        onSubmit={(evento) => {
          evento.preventDefault();
          if (!datos.success || cerrado) return;
          void operacion.ejecutar(async () => {
            await abrirJornada(cliente, datos.data);
            if (!operacion.estaVigente()) return;
            notificarOperacion({
              id: 'jornada-abierta',
              tipo: 'exito',
              mensaje: 'Jornada abierta correctamente.',
            });
            alGuardar();
          });
        }}
      >
        <Stack gap="md">
          <Text>
            Selecciona los recursos del catálogo. El servidor confirmará que siguen disponibles.
          </Text>
          <Alert color="blue" variant="light">
            La cuenta del repartidor debe estar activada en Seguridad. El vínculo del catálogo
            identifica a la persona y no confirma su activación global.
          </Alert>
          {operacion.error && (
            <Alert color="red" variant="light" title="No se pudo abrir la jornada" role="alert">
              {operacion.conflicto ? (
                <Stack gap="sm">
                  <List spacing="sm">
                    {operacion.conflicto.jornadasBloqueantes.map((jornada) => (
                      <List.Item key={jornada.idJornada}>
                        <Text fw={600}>
                          Jornada {jornada.estado === 'ACTIVA' ? 'activa' : 'cerrada'} del{' '}
                          {fechaLegible(jornada.fecha)} · Furgoneta {jornada.placa}
                        </Text>
                        <Text size="sm">
                          {jornada.bloqueaRepartidor && jornada.bloqueaFurgoneta
                            ? 'Bloquea al repartidor y a la furgoneta seleccionados.'
                            : jornada.bloqueaRepartidor
                              ? 'Bloquea al repartidor seleccionado.'
                              : 'Bloquea a la furgoneta seleccionada.'}
                        </Text>
                        <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
                          {jornada.despachosPendientes.length === 1
                            ? '1 despacho pendiente'
                            : `${jornada.despachosPendientes.length} despachos pendientes`}
                          {!!jornada.despachosPendientes.length &&
                            ` · ${jornada.despachosPendientes.join(', ')}`}
                        </Text>
                        {jornada.reservasActivas > 0 && (
                          <Text size="sm">
                            {jornada.reservasActivas === 1
                              ? '1 reserva de capacidad activa'
                              : `${jornada.reservasActivas} reservas de capacidad activas`}
                          </Text>
                        )}
                      </List.Item>
                    ))}
                  </List>
                  <Text size="sm">
                    En Jornadas y monitoreo, selecciona la fecha de la jornada y abre Ver detalle.
                  </Text>
                </Stack>
              ) : (
                operacion.error
              )}
            </Alert>
          )}
          {recursos.error && (
            <Alert color="red" variant="light" title="No pudimos cargar los recursos" role="alert">
              <Stack gap="sm" align="flex-start">
                <Text>{recursos.error}</Text>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  mih={44}
                  onClick={recursos.actualizar}
                >
                  Reintentar catálogos
                </Button>
              </Stack>
            </Alert>
          )}
          <EstadoVista
            estado={recursos.cargando && !recursos.datos ? 'carga' : 'datos'}
            esqueleto={<Loader aria-label="Cargando recursos" />}
          >
            <fieldset disabled={cerrado} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <Stack gap="md">
                <TextInput
                  label="Fecha de la jornada"
                  value={fechaLegible(fecha)}
                  readOnly
                  required
                  description="Fecha actual de Operación en America/Bogota."
                />
                <Select
                  label="Repartidor"
                  required
                  searchable
                  clearable
                  data={recursos.datos?.repartidores ?? []}
                  value={repartidor}
                  onChange={(id) => {
                    seleccionarRepartidor(id);
                    operacion.limpiarError();
                  }}
                  nothingFoundMessage="No hay repartidores activos y vinculados"
                />
                <Select
                  label="Furgoneta"
                  required
                  searchable
                  clearable
                  data={recursos.datos?.furgonetas ?? []}
                  value={furgoneta}
                  onChange={(id) => {
                    seleccionarFurgoneta(id);
                    operacion.limpiarError();
                  }}
                  nothingFoundMessage="No hay furgonetas disponibles"
                />
                <Select
                  label="Zona"
                  required
                  searchable
                  clearable
                  data={recursos.datos?.zonas ?? []}
                  value={zona}
                  onChange={seleccionarZona}
                  nothingFoundMessage="No hay zonas activas"
                />
              </Stack>
            </fieldset>
          </EstadoVista>
          {operacion.incierta && (
            <Text>
              Los datos ingresados se conservan. Consulta el tablero para comprobar si se creó la
              jornada.
            </Text>
          )}
          <Group justify="flex-end">
            <Button
              type="button"
              variant="outline"
              mih={44}
              disabled={operacion.procesando}
              onClick={alCerrar}
            >
              {operacion.incierta ? 'Consultar estado' : 'Cancelar'}
            </Button>
            <Button
              type="submit"
              mih={44}
              loading={operacion.procesando}
              disabled={cerrado || !datos.success}
            >
              Abrir jornada
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
