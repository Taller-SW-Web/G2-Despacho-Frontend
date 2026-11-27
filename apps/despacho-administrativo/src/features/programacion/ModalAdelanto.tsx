import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { notificarOperacion } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import {
  adelantarDespacho,
  interpretarError,
  type ComandoAdelanto,
  type ErrorProgramacion,
} from './api';
import { formatearFecha, type Pendiente } from './modelo';

export function ModalAdelanto({
  despacho,
  hoy,
  alCerrar,
  alActualizarCola,
  alDenegar,
}: {
  despacho: Pendiente;
  hoy: string;
  alCerrar: () => void;
  alActualizarCola: () => void;
  alDenegar: () => void;
}) {
  const cliente = useClienteApi();
  const [motivo, establecerMotivo] = useState('');
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState<ErrorProgramacion | null>(null);
  const comando = useRef<ComandoAdelanto | null>(null);
  const enCurso = useRef(false);
  const vigente = useRef(true);
  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
    };
  }, []);
  const texto = motivo.trim();
  const valido = texto.length > 0 && [...texto].length <= 500;
  const conflicto = error?.estado === 409;
  const confirmar = async () => {
    if (enCurso.current || conflicto || (!comando.current && !valido)) return;
    comando.current ??= {
      idDespacho: despacho.idDespacho,
      version: despacho.versionDespacho,
      fechaAnterior: despacho.fechaProgramada,
      clave: crypto.randomUUID(),
      motivo: texto,
    };
    enCurso.current = true;
    establecerGuardando(true);
    establecerError(null);
    try {
      const respuesta = await adelantarDespacho(cliente, comando.current);
      if (!vigente.current) return;
      notificarOperacion({
        id: `adelanto-${despacho.idDespacho}`,
        tipo: 'exito',
        mensaje: `Despacho ${despacho.codigoOperativo} adelantado al ${formatearFecha(respuesta.fechaProgramada)}. Continúa pendiente de asignación.`,
      });
      alActualizarCola();
    } catch (fallo) {
      if (!vigente.current) return;
      const interpretado = interpretarError(fallo, true);
      if (interpretado.permiso) alDenegar();
      else {
        establecerError(interpretado);
        // Solo un rechazo definitivo permite editar. Un resultado incierto conserva el comando.
        if (!interpretado.incierto) comando.current = null;
      }
    } finally {
      enCurso.current = false;
      if (vigente.current) establecerGuardando(false);
    }
  };
  return (
    <Modal
      opened
      title={`Adelantar despacho ${despacho.codigoOperativo}`}
      onClose={() => {
        if (!enCurso.current) alCerrar();
      }}
      closeOnClickOutside={!guardando}
      closeOnEscape={!guardando}
      withCloseButton={!guardando}
      returnFocus={false}
      size="md"
      closeButtonProps={{ 'aria-label': 'Cerrar adelanto' }}
    >
      <Stack>
        <Text>Fecha programada: {formatearFecha(despacho.fechaProgramada)}.</Text>
        <Text>Nueva fecha: {formatearFecha(hoy)} (hoy del servidor, America/Lima).</Text>
        <Text size="sm">
          No asigna un repartidor ni reserva capacidad. La fecha definitiva se calcula en el
          servidor al confirmar.
        </Text>
        <Textarea
          label="Motivo del adelanto"
          required
          data-autofocus
          value={motivo}
          onChange={(e) => establecerMotivo(e.currentTarget.value)}
          disabled={guardando || Boolean(error?.incierto) || conflicto}
          error={[...texto].length > 500 ? 'No puede superar 500 caracteres' : undefined}
          description="Obligatorio. Hasta 500 caracteres."
          rows={3}
        />
        {error && (
          <Alert color="red.8" title="No se pudo confirmar el adelanto" role="alert">
            {error.mensaje}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" mih={44} disabled={guardando} onClick={alCerrar}>
            Cancelar
          </Button>
          {conflicto || error?.incierto ? (
            <Button variant="outline" mih={44} disabled={guardando} onClick={alActualizarCola}>
              Cerrar y consultar cola
            </Button>
          ) : null}
          {!conflicto && (
            <Button
              mih={44}
              loading={guardando}
              disabled={!valido || guardando}
              onClick={() => {
                void confirmar();
              }}
            >
              {error?.incierto ? 'Recuperar adelanto' : 'Confirmar adelanto'}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
