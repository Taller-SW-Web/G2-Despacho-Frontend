import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Group, Modal, Radio, Skeleton, Stack, Text, Textarea } from '@mantine/core';
import {
  EstadoVista,
  notificarOperacion,
  TarjetaRepartidor,
} from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarDisponibles, interpretarError, type ErrorProgramacion } from './api';
import { reasignarDespacho } from './rutasApi';
import { type ComandoReasignacion, type Parada } from './rutasModelo';
import { useLecturaProgramacion, useVigenciaProgramacion } from './useLecturaProgramacion';
import clases from './Programacion.module.css';

export function ModalReasignacion({
  parada,
  idJornada,
  conductor,
  alCerrar,
  alConfirmar,
  alDenegar,
}: {
  parada: Parada;
  idJornada: string;
  conductor: string;
  alCerrar: () => void;
  alConfirmar: (idDestino: string) => void;
  alDenegar: () => void;
}) {
  const cliente = useClienteApi();
  const cargar = useCallback(
    (signal: AbortSignal) => consultarDisponibles(cliente, signal),
    [cliente],
  );
  const consulta = useLecturaProgramacion(cargar);
  const [seleccion, seleccionar] = useState('');
  const [motivo, cambiarMotivo] = useState('');
  const [guardando, guardar] = useState(false);
  const [error, establecerError] = useState<ErrorProgramacion | null>(null);
  const [comando, conservarComando] = useState<ComandoReasignacion | null>(null);
  const ocupado = useRef(false),
    vigente = useRef(true);
  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
    };
  }, []);
  useEffect(() => {
    seleccionar('');
  }, [consulta.datos]);
  useEffect(() => {
    if (consulta.error?.permiso) alDenegar();
  }, [consulta.error, alDenegar]);
  useVigenciaProgramacion(consulta.actualizar, !guardando && !error && !comando);
  const candidatos = (consulta.datos ?? []).filter((r) => r.idRepartidor !== parada.idRepartidor);
  const elegido = candidatos.find((r) => r.idRepartidor === seleccion);
  const excede = (r: (typeof candidatos)[number]) =>
    parada.pesoKg > r.capacidadRemanente.pesoKg ||
    parada.volumenM3 > r.capacidadRemanente.volumenM3 ||
    parada.cantidadPaquetes > r.capacidadRemanente.paquetes;
  const incierto = Boolean(error?.incierto),
    conflicto = error?.estado === 409 && !incierto;
  const bloqueada =
    guardando || incierto || conflicto || consulta.cargando || Boolean(consulta.error);
  const motivoValido = motivo.trim().length > 0 && [...motivo.trim()].length <= 500;
  async function confirmar(recuperar = false) {
    if (ocupado.current) return;
    if (!recuperar && (bloqueada || !elegido || excede(elegido) || !motivoValido)) return;
    const original = recuperar
      ? comando
      : {
          idDespacho: parada.idDespacho,
          idRepartidorOrigen: parada.idRepartidor,
          idJornadaOrigen: idJornada,
          version: parada.version,
          // Solo un comando nuevo genera clave; una recuperación reutiliza la del comando conservado.
          clave: crypto.randomUUID(),
          cuerpo: {
            idNuevoRepartidor: elegido!.idRepartidor,
            idNuevaJornada: elegido!.idJornada,
            motivo: motivo.trim(),
          },
        };
    if (!original) return;
    ocupado.current = true;
    guardar(true);
    conservarComando(original);
    establecerError(null);
    try {
      const respuesta = await reasignarDespacho(cliente, original);
      if (!vigente.current) return;
      notificarOperacion({
        id: `reasignacion-${original.clave}`,
        tipo: 'exito',
        mensaje: `Despacho ${parada.codigoOperativo} reasignado. Parada #${respuesta.posicionSecuencia} en la jornada destino.`,
      });
      alConfirmar(respuesta.idJornada);
    } catch (fallo) {
      if (!vigente.current) return;
      const interpretado = interpretarError(fallo, true);
      if (
        interpretado.estado === 409 &&
        interpretado.codigo === 'DESP_ERROR_REASIGNACION_EN_PROCESO'
      )
        // Otra solicitud sigue en proceso: el resultado aún no se conoce y el comando se conserva.
        interpretado.incierto = true;
      if (interpretado.permiso) alDenegar();
      else {
        establecerError(interpretado);
        if (!interpretado.incierto) {
          conservarComando(null);
          seleccionar('');
        }
        if (interpretado.estado === 422) consulta.actualizar();
      }
    } finally {
      ocupado.current = false;
      if (vigente.current) guardar(false);
    }
  }
  return (
    <Modal
      opened
      title={`Reasignar despacho ${parada.codigoOperativo}`}
      size={880}
      radius="lg"
      onClose={() => {
        if (!guardando && !incierto) alCerrar();
      }}
      closeOnEscape={!guardando && !incierto}
      closeOnClickOutside={!guardando && !incierto}
      withCloseButton={!guardando && !incierto}
      returnFocus={false}
      closeButtonProps={{ 'aria-label': 'Cerrar reasignación' }}
      classNames={{
        content: clases.modal,
        title: clases.tituloModal,
        header: clases.cabeceraModal,
        body: clases.cuerpoModal,
      }}
    >
      <Stack gap="lg">
        <Stack gap="xs" className={clases.resumen}>
          <Text fw={600}>
            {parada.codigoRastreoInterno} · Pedido {parada.idPedido}
          </Text>
          <Text>{parada.direccion}</Text>
          <Text>
            Repartidor actual: {conductor} · Parada #{parada.posicion}
          </Text>
          <Text>
            {parada.pesoKg} kg · {parada.volumenM3} m³ · {parada.cantidadPaquetes} paquetes
          </Text>
        </Stack>
        {consulta.cargando ? (
          <EstadoVista estado="carga" esqueleto={<Skeleton height={144} />} />
        ) : consulta.error ? (
          <EstadoVista
            estado="error"
            descripcion={consulta.error.mensaje}
            accion={{ id: 'reintentar', etiqueta: 'Reintentar candidatos' }}
            alAccionar={consulta.actualizar}
          />
        ) : candidatos.length === 0 ? (
          <EstadoVista estado="vacio" titulo="No hay otros repartidores disponibles" />
        ) : (
          <Radio.Group label="Nuevo repartidor" value={seleccion}>
            <Stack gap="md" className={`${clases.lista} ${clases.candidatosRuta}`}>
              {candidatos.map((r) => {
                const sobrecarga = excede(r),
                  proyectar = seleccion === r.idRepartidor || sobrecarga;
                return (
                  <TarjetaRepartidor
                    key={r.idRepartidor}
                    idRepartidor={r.idRepartidor}
                    nombre={r.nombre}
                    placa={r.placa}
                    zona={r.idZona}
                    estadoOperativo={r.estadoOperativo}
                    seleccionada={seleccion === r.idRepartidor}
                    disabled={bloqueada || sobrecarga}
                    motivoDeshabilitado={
                      sobrecarga ? 'Capacidad insuficiente para este despacho.' : undefined
                    }
                    alSeleccionar={(id) => {
                      seleccionar(id);
                      establecerError(null);
                    }}
                    metricas={[
                      {
                        metrica: 'peso',
                        usado: r.ocupacion.pesoKg,
                        limite: r.limites.pesoKg,
                        proyeccion: proyectar ? r.ocupacion.pesoKg + parada.pesoKg : undefined,
                      },
                      {
                        metrica: 'volumen',
                        usado: r.ocupacion.volumenM3,
                        limite: r.limites.volumenM3,
                        proyeccion: proyectar
                          ? r.ocupacion.volumenM3 + parada.volumenM3
                          : undefined,
                      },
                      {
                        metrica: 'paquetes',
                        usado: r.ocupacion.paquetes,
                        limite: r.limites.paquetes,
                        proyeccion: proyectar
                          ? r.ocupacion.paquetes + parada.cantidadPaquetes
                          : undefined,
                      },
                    ]}
                  />
                );
              })}
            </Stack>
          </Radio.Group>
        )}
        <Textarea
          label="Motivo de la reasignación"
          required
          value={motivo}
          disabled={guardando || incierto || conflicto}
          onChange={(e) => cambiarMotivo(e.currentTarget.value)}
          error={
            motivo && !motivoValido
              ? 'Indica un motivo de 1 a 500 caracteres.'
              : error?.campos.motivo
          }
          description={`${[...motivo.trim()].length}/500 caracteres`}
        />
        {error && (
          <Alert color="red.8" title="No se pudo confirmar la reasignación" role="alert">
            <Text>
              {incierto
                ? 'No conocemos el resultado. Conservamos la misma solicitud; recupera su respuesta sin crear otra transferencia.'
                : error.mensaje}
            </Text>
            {incierto && (
              <Button
                mt="sm"
                variant="outline"
                loading={guardando}
                onClick={() => {
                  void confirmar(true);
                }}
              >
                Recuperar misma reasignación
              </Button>
            )}
            {conflicto && (
              <Button mt="sm" variant="outline" onClick={alCerrar}>
                Cerrar y actualizar rutas
              </Button>
            )}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="outline" disabled={guardando || incierto} onClick={alCerrar}>
            Cancelar
          </Button>
          <Button
            loading={guardando}
            disabled={bloqueada || !elegido || excede(elegido) || !motivoValido}
            onClick={() => {
              void confirmar();
            }}
          >
            Confirmar reasignación
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
