import { useState } from 'react';
import { Alert, Button, Group, Modal, NumberInput, Select, Stack, Text, Textarea } from '@mantine/core';
import { esquemaSimulacion, type SolicitudSimulacion, type ZonaProgramacion } from './modelo';
import type { ErrorProgramacion } from './api';
import clases from './Programacion.module.css';

export function ModalSimulacion({ zonas, guardando, error, alCerrar, alGenerar, alConsultar }: {
  zonas: ZonaProgramacion[]; guardando: boolean; error: ErrorProgramacion | null;
  alCerrar: () => void; alGenerar: (solicitud: SolicitudSimulacion) => Promise<boolean>; alConsultar: () => void;
}) {
  const [idZona, establecerZona] = useState<string | null>(null);
  const [peso, establecerPeso] = useState<string | number>(5);
  const [volumen, establecerVolumen] = useState<string | number>(0.025);
  const [observaciones, establecerObservaciones] = useState('');
  const [campos, establecerCampos] = useState<Record<string, string>>({});
  const errores = { ...campos, ...error?.campos };
  return <Modal opened onClose={alCerrar} size={560} radius="lg" title="Generar despacho de prueba personalizado"
    classNames={{ content: clases.modal, title: clases.tituloModal, header: clases.cabeceraModal, body: clases.cuerpoModal }} closeOnEscape={!guardando} closeOnClickOutside={!guardando}
    withCloseButton={!guardando} returnFocus={false} closeButtonProps={{ 'aria-label': 'Cerrar simulación' }}>
    <form onSubmit={async (evento) => {
      evento.preventDefault();
      const solicitud = esquemaSimulacion.safeParse({ ...(idZona ? { idZona } : {}), pesoKg: peso, volumenM3: volumen, observaciones });
      if (!solicitud.success) {
        establecerCampos(Object.fromEntries(solicitud.error.issues.map((i) => [String(i.path[0]), 'Indica un número mayor que cero o revisa la longitud del texto.'])));
        return;
      }
      establecerCampos({});
      if (await alGenerar(solicitud.data)) alCerrar();
    }}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">Crea datos de prueba dentro de la cobertura activa. Si no eliges zona, el servidor seleccionará una disponible.</Text>
        <Select label="Zona de prueba" placeholder="Seleccionar automáticamente" clearable searchable data={zonas.map((z) => ({ value: z.id, label: z.nombre }))}
          value={idZona} onChange={establecerZona} disabled={guardando} error={errores.idZona} />
        <NumberInput label="Peso (kg)" value={peso} onChange={establecerPeso} min={0} step={0.5} required disabled={guardando} error={errores.pesoKg} />
        <NumberInput label="Volumen (m³)" value={volumen} onChange={establecerVolumen} min={0} step={0.001} required disabled={guardando} error={errores.volumenM3} />
        <Textarea label="Observaciones" value={observaciones} onChange={(e) => establecerObservaciones(e.currentTarget.value)} maxLength={250}
          description={`${observaciones.length}/250 caracteres`} disabled={guardando} error={errores.observaciones} />
        {error && <Alert color="red.8" title="No se pudo confirmar la generación" role="alert"><Text>{error.mensaje}</Text>
          {error.incierto && <Button type="button" variant="outline" mt="sm" onClick={alConsultar}>Consultar cola</Button>}
        </Alert>}
        <Group justify="flex-end"><Button type="button" variant="outline" disabled={guardando} onClick={alCerrar}>Cancelar</Button>
          <Button type="submit" loading={guardando} disabled={error?.incierto}>Generar</Button></Group>
      </Stack>
    </form>
  </Modal>;
}
