import { useCallback, useState } from 'react';
import { Alert, Badge, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconUser } from '@tabler/icons-react';
import { CapturaEvidencia, notificarOperacion } from '@despacho/componentes-compartidos';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { POLITICA_EVIDENCIA } from '../config';
import { useOperacion } from '../api/ContextoOperacion';
import { aErrorOperacion } from '../api/errores';
import { CargandoTarjetas, ErrorConsulta, Pantalla } from '../componentes/Pantalla';
import { useConsulta } from '../componentes/useConsulta';
import { useEvidencia } from '../evidencia/useEvidencia';
import { claveDeIntencion, liberarClave } from '../utilidades/claves';
import { formatearTamano } from '../utilidades/formato';

export function DetalleFoto({ foto }: { foto: File }) {
  return (
    <Group gap="xs" wrap="nowrap" c="var(--ia-color-text-secondary)">
      <IconCircleCheck size={20} color="var(--ia-color-success-default)" aria-hidden="true" />
      <Text size="sm">Foto optimizada · {formatearTamano(foto.size)} · sin datos de ubicación</Text>
    </Group>
  );
}

/** 05 · Confirmar entrega sin foto y 06 · con foto. La foto es obligatoria (ES-F03-05 RN-01). */
export function PaginaEntrega() {
  const { id = '' } = useParams();
  const operacion = useOperacion();
  const navigate = useNavigate();
  const cargar = useCallback((signal: AbortSignal) => operacion.consultarDetalle(id, signal), [operacion, id]);
  const { consulta, recargar } = useConsulta(cargar);
  const evidencia = useEvidencia(id, 'ENTREGA');
  const [recibidoPor, setRecibidoPor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alcance = `entrega:${id}`;
  const detalle = consulta.estado === 'lista' ? consulta.datos : null;

  if (detalle && detalle.estado !== 'EN_CAMINO') return <Navigate to={`/repartidor/despachos/${id}`} replace />;

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      const idEvidencia = await evidencia.asegurarCarga();
      const resultado = await operacion.registrarEntrega(id, claveDeIntencion(alcance), {
        idEvidencia, recibidoPor: recibidoPor.trim() || null,
      });
      liberarClave(alcance);
      notificarOperacion({ id: `entrega-${id}`, tipo: 'exito', mensaje: `Entrega de ${resultado.codigoRastreoInterno} registrada.` });
      navigate('/repartidor/ruta', { replace: true });
    } catch (fallo) {
      const traducido = aErrorOperacion(fallo);
      if (!traducido.reintentable) liberarClave(alcance);
      if (traducido.tipo === 'conflicto' && traducido.codigo !== 'DESP_ERROR_EVIDENCIA_NO_CARGADA') {
        notificarOperacion({ id: `conflicto-${id}`, tipo: 'informacion', mensaje: traducido.message });
        navigate(`/repartidor/despachos/${id}`, { replace: true });
        return;
      }
      setError(traducido.message);
      setEnviando(false);
    }
  }

  const seleccionar = (archivo: File) => { liberarClave(alcance); setError(null); void evidencia.seleccionar(archivo); };
  const listo = Boolean(evidencia.foto) && evidencia.fase !== 'procesando';

  return (
    <Pantalla
      titulo="Confirmar entrega"
      alVolver={() => navigate(`/repartidor/despachos/${id}`)}
      acciones={detalle && (
        <Button fullWidth size="lg" leftSection={<IconCircleCheck size={20} />} disabled={!listo} loading={enviando} onClick={confirmar}>
          Confirmar entrega
        </Button>
      )}
    >
      {consulta.estado === 'cargando' && <CargandoTarjetas cantidad={2} />}
      {consulta.estado === 'error' && <ErrorConsulta error={consulta.error} alReintentar={recargar} />}
      {detalle && (
        <Stack gap="md">
          <Stack gap={2}>
            <Text c="var(--ia-color-text-secondary)">{detalle.codigoRastreoInterno}</Text>
            <Text fw={700} size="lg">{detalle.destino?.direccion}{detalle.destino ? `, ${detalle.destino.distrito}` : ''}</Text>
          </Stack>
          <Group justify="space-between">
            <Text fw={700}>Foto del paquete entregado</Text>
            {listo && <Badge color="green" variant="light" tt="none">Lista</Badge>}
          </Group>
          <CapturaEvidencia
            archivo={evidencia.foto}
            descripcionFoto="Foto del paquete entregado"
            fase={evidencia.fase}
            politicaArchivo={{ tiposPermitidos: [...POLITICA_EVIDENCIA.tiposPermitidos], maximoBytes: POLITICA_EVIDENCIA.maximoBytes }}
            progreso={evidencia.progreso}
            error={evidencia.error}
            disabled={enviando}
            alSeleccionar={seleccionar}
            alVolverATomar={() => undefined}
            alReintentar={confirmar}
          />
          {evidencia.foto && <DetalleFoto foto={evidencia.foto} />}
          {!evidencia.foto && evidencia.fase !== 'procesando' && (
            <Text size="sm" c="var(--ia-color-text-secondary)">La foto es obligatoria para confirmar la entrega.</Text>
          )}
          <TextInput label="Nombre de quien recibe (opcional)" leftSection={<IconUser size={20} aria-hidden="true" />}
            value={recibidoPor} maxLength={120} autoComplete="off" disabled={enviando}
            onChange={(evento) => setRecibidoPor(evento.currentTarget.value)} />
          {error && evidencia.fase !== 'error' && (
            <Alert color="red" icon={<IconAlertCircle size={18} />} title="No se registró la entrega" role="alert">{error}</Alert>
          )}
        </Stack>
      )}
    </Pantalla>
  );
}
