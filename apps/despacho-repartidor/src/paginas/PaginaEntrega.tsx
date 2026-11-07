import { useCallback, useState } from 'react';
import { Alert, Badge, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconUser } from '@tabler/icons-react';
import { CapturaEvidencia, notificarOperacion } from '@despacho/componentes-compartidos';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { POLITICA_EVIDENCIA } from '../config';
import { useOperacion } from '../api/ContextoOperacion';
import { aErrorOperacion } from '../api/errores';
import { trabajoDe, type TipoTrabajo } from '../api/trabajo';
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
export function PaginaEntrega({ tipo = 'ENTREGA' }: { tipo?: TipoTrabajo }) {
  const { id = '' } = useParams();
  const operacion = useOperacion();
  const navigate = useNavigate();
  const esRecojo = tipo === 'RECOJO';
  const base = trabajoDe(operacion, tipo).base;
  const nombreAccion = esRecojo ? 'Confirmar recojo' : 'Confirmar entrega';
  const descripcionFoto = esRecojo ? 'Foto del producto recogido' : 'Foto del paquete entregado';
  const cargar = useCallback((signal: AbortSignal) => trabajoDe(operacion, tipo).consultar(id, signal), [operacion, id, tipo]);
  const { consulta, recargar } = useConsulta(cargar);
  const evidencia = useEvidencia(id, esRecojo ? 'RECOJO' : 'ENTREGA');
  const [recibidoPor, setRecibidoPor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alcance = `${esRecojo ? 'recogido' : 'entrega'}:${id}`;
  const detalle = consulta.estado === 'lista' ? consulta.datos : null;

  if (detalle && detalle.estado !== 'EN_CAMINO') return <Navigate to={`${base}/${id}`} replace />;

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      const idEvidencia = await evidencia.asegurarCarga();
      const texto = recibidoPor.trim() || null;
      const resultado = esRecojo
        ? await operacion.registrarRecogido(id, claveDeIntencion(alcance), { idEvidencia, comentario: texto })
        : await operacion.registrarEntrega(id, claveDeIntencion(alcance), { idEvidencia, recibidoPor: texto });
      liberarClave(alcance);
      notificarOperacion({ id: `${esRecojo ? 'recojo' : 'entrega'}-${id}`, tipo: 'exito',
        mensaje: esRecojo ? 'Recojo registrado. Lleva el producto al centro de despacho.' : `Entrega de ${resultado.codigoRastreoInterno} registrada.` });
      navigate('/repartidor/ruta', { replace: true });
    } catch (fallo) {
      const traducido = aErrorOperacion(fallo);
      if (!traducido.reintentable) liberarClave(alcance);
      if (traducido.tipo === 'conflicto' && traducido.codigo !== 'DESP_ERROR_EVIDENCIA_NO_CARGADA') {
        notificarOperacion({ id: `conflicto-${id}`, tipo: 'informacion', mensaje: traducido.message });
        navigate(`${base}/${id}`, { replace: true });
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
      titulo={nombreAccion}
      alVolver={() => navigate(`${base}/${id}`)}
      acciones={detalle && (
        <Button fullWidth size="lg" leftSection={<IconCircleCheck size={20} />} disabled={!listo} loading={enviando} onClick={confirmar}>
          {nombreAccion}
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
            <Text fw={700}>{descripcionFoto}</Text>
            {listo && <Badge color="green" variant="light" tt="none">Lista</Badge>}
          </Group>
          <CapturaEvidencia
            archivo={evidencia.foto}
            descripcionFoto={descripcionFoto}
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
            <Text size="sm" c="var(--ia-color-text-secondary)">{esRecojo ? 'Agrega una foto para continuar.' : 'La foto es obligatoria para confirmar la entrega.'}</Text>
          )}
          <TextInput label={esRecojo ? 'Comentario (opcional)' : 'Nombre de quien recibe (opcional)'} leftSection={<IconUser size={20} aria-hidden="true" />}
            value={recibidoPor} maxLength={esRecojo ? 200 : 120} autoComplete="off" disabled={enviando}
            onChange={(evento) => setRecibidoPor(evento.currentTarget.value)} />
          {error && evidencia.fase !== 'error' && (
            <Alert color="red" icon={<IconAlertCircle size={18} />} title={esRecojo ? 'No se registró el recojo' : 'No se registró la entrega'} role="alert">{error}</Alert>
          )}
        </Stack>
      )}
    </Pantalla>
  );
}
