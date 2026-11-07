import { useRef, useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { notificarOperacion } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { interpretarErrorRecojo, resolverRecojo } from './api';
import type { AccionRecojo, Recojo } from './modelo';

const TEXTOS: Record<AccionRecojo, { titulo: string; boton: string; exito: string; ayuda: string }> = {
  recepcion: { titulo: 'Confirmar recepción', boton: 'Confirmar recepción', exito: 'Recepción confirmada. Se liberará la capacidad.', ayuda: 'Confirma solo si el producto ya llegó al centro de despacho.' },
  reprogramacion: { titulo: 'Reprogramar recojo', boton: 'Reprogramar', exito: 'Recojo reprogramado. Vuelve a la lista por asignar.', ayuda: 'El recojo volverá a la lista por asignar con esta fecha.' },
  cierre: { titulo: 'Cerrar sin recojo', boton: 'Cerrar recojo', exito: 'Recojo cerrado sin recoger el producto.', ayuda: 'Esta decisión es definitiva. El producto queda con el cliente.' },
};

/** ES-F04-07 UI-02: el servidor vuelve a validar estado y versión. */
export function ModalResolverRecojo({ recojo, accion, hoy, alCerrar, alResolver }: {
  recojo: Recojo; accion: AccionRecojo; hoy: string; alCerrar: () => void; alResolver: () => void;
}) {
  const cliente = useClienteApi();
  const textos = TEXTOS[accion];
  const [fecha, establecerFecha] = useState(hoy);
  const [nota, establecerNota] = useState('');
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState<string | null>(null);
  const clave = useRef(crypto.randomUUID());
  const faltaMotivo = accion === 'cierre' && !nota.trim();
  const faltaFecha = accion === 'reprogramacion' && (!fecha || fecha < hoy);
  const confirmar = async () => {
    if (faltaMotivo || faltaFecha || guardando) return;
    establecerGuardando(true); establecerError(null);
    const texto = nota.trim();
    const datos: Record<string, string> = accion === 'cierre' ? { motivoCierre: texto }
      : accion === 'reprogramacion' ? { fechaProgramada: fecha, ...(texto ? { observacion: texto } : {}) }
      : texto ? { observacion: texto } : {};
    try {
      await resolverRecojo(cliente, recojo, accion, clave.current, datos);
      notificarOperacion({ id: `${accion}-${recojo.idRecojo}`, tipo: 'exito', mensaje: textos.exito });
      alResolver();
    } catch (fallo) {
      const interpretado = interpretarErrorRecojo(fallo, true);
      if (!interpretado.incierto) clave.current = crypto.randomUUID();
      establecerError(interpretado.mensaje); establecerGuardando(false);
    }
  };
  return <Modal opened onClose={alCerrar} title={`${textos.titulo} · ${recojo.codigoRastreoInterno}`} centered closeOnClickOutside={!guardando} closeOnEscape={!guardando}>
    <Stack gap="md">
      <Text size="sm">{textos.ayuda}</Text>
      {accion === 'reprogramacion' && <TextInput type="date" label="Nueva fecha" required min={hoy} value={fecha} disabled={guardando}
        error={faltaFecha ? 'Elige hoy o una fecha posterior.' : undefined} onChange={(evento) => establecerFecha(evento.currentTarget.value)} />}
      <Textarea label={accion === 'cierre' ? 'Motivo del cierre' : 'Observación (opcional)'} required={accion === 'cierre'} maxLength={500} value={nota} disabled={guardando}
        onChange={(evento) => establecerNota(evento.currentTarget.value)} />
      {error && <Alert color="red" role="alert">{error}</Alert>}
      <Group justify="flex-end">
        <Button type="button" variant="outline" disabled={guardando} onClick={alCerrar}>Cancelar</Button>
        <Button type="button" loading={guardando} disabled={faltaMotivo || faltaFecha} onClick={() => void confirmar()}>{textos.boton}</Button>
      </Group>
    </Stack>
  </Modal>;
}
