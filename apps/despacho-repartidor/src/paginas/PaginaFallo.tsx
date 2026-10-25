import { useCallback, useState } from 'react';
import { Alert, Button, FileButton, Group, Image, Loader, Paper, Radio, Stack, Text, Textarea } from '@mantine/core';
import { IconAlertCircle, IconCamera, IconCircleCheck, IconRefresh, IconX } from '@tabler/icons-react';
import { notificarOperacion } from '@despacho/componentes-compartidos';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { POLITICA_EVIDENCIA } from '../config';
import { useOperacion } from '../api/ContextoOperacion';
import { aErrorOperacion } from '../api/errores';
import { CargandoTarjetas, ErrorConsulta, Pantalla } from '../componentes/Pantalla';
import { useConsulta } from '../componentes/useConsulta';
import { useEvidencia } from '../evidencia/useEvidencia';
import { claveDeIntencion, liberarClave } from '../utilidades/claves';
import { formatearTamano, intentoEnCurso } from '../utilidades/formato';
import { useObjetoUrl } from '../utilidades/useObjetoUrl';
import type { EstadoFalloRegistrado } from './PaginaFalloRegistrado';
import clases from './PaginaFallo.module.css';

const MAXIMO_COMENTARIO = 200;

/** 08 · Marcar como fallido. Motivo del catálogo de Gestión, foto obligatoria y comentario opcional (ES-F03-06). */
export function PaginaFallo() {
  const { id = '' } = useParams();
  const operacion = useOperacion();
  const navigate = useNavigate();
  const cargar = useCallback(async (signal: AbortSignal) => {
    const [detalle, motivos] = await Promise.all([operacion.consultarDetalle(id, signal), operacion.consultarMotivos(signal)]);
    // RN-02: solo motivos activos y seleccionables en campo; nunca NO_INTENTADO.
    return { detalle, motivos: motivos.filter((m) => m.activo && m.seleccionableEnCampo && m.codigo !== 'NO_INTENTADO') };
  }, [operacion, id]);
  const { consulta, recargar } = useConsulta(cargar);
  const evidencia = useEvidencia(id, 'FALLO');
  const miniatura = useObjetoUrl(evidencia.foto);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentoEnvio, setIntentoEnvio] = useState(false);
  const alcance = `fallo:${id}`;
  const datos = consulta.estado === 'lista' ? consulta.datos : null;

  if (datos && datos.detalle.estado !== 'EN_CAMINO') return <Navigate to={`/repartidor/despachos/${id}`} replace />;

  async function registrar() {
    setIntentoEnvio(true);
    if (!motivo || !evidencia.foto || !datos) return;
    setEnviando(true);
    setError(null);
    try {
      const idEvidencia = await evidencia.asegurarCarga();
      const resultado = await operacion.registrarFallo(id, claveDeIntencion(alcance), {
        motivo, idEvidencia, comentario: comentario.trim() || null,
      });
      liberarClave(alcance);
      const estado: EstadoFalloRegistrado = {
        codigo: resultado.codigoRastreoInterno,
        motivo: datos.motivos.find((m) => m.codigo === motivo)?.etiqueta ?? motivo,
        intento: resultado.numeroIntentos,
        maximo: resultado.maximoIntentos,
      };
      navigate(`/repartidor/despachos/${id}/fallo-registrado`, { replace: true, state: estado });
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

  const seleccionar = (archivo: File | null) => {
    if (!archivo) return;
    liberarClave(alcance);
    setError(null);
    void evidencia.seleccionar(archivo);
  };
  const procesandoFoto = evidencia.fase === 'procesando';
  const subiendo = evidencia.fase === 'subiendo';

  return (
    <Pantalla
      titulo="Marcar como fallido"
      alVolver={() => navigate(`/repartidor/despachos/${id}`)}
      acciones={datos && (
        <Button fullWidth size="lg" color="red" variant="filled" leftSection={<IconX size={20} />} loading={enviando}
          disabled={procesandoFoto} onClick={registrar}>
          Registrar fallo
        </Button>
      )}
    >
      {consulta.estado === 'cargando' && <CargandoTarjetas cantidad={4} />}
      {consulta.estado === 'error' && <ErrorConsulta error={consulta.error} alReintentar={recargar} />}
      {datos && (
        <Stack gap="md">
          <Text c="var(--ia-color-text-secondary)">
            {datos.detalle.codigoRastreoInterno}{datos.detalle.destino ? ` · ${datos.detalle.destino.direccion}` : ''}
          </Text>
          <Radio.Group label="¿Qué ocurrió?" value={motivo} onChange={setMotivo} withAsterisk
            error={intentoEnvio && !motivo ? 'Selecciona el motivo.' : undefined} classNames={{ label: clases.etiquetaGrupo }}>
            <Stack gap="sm" mt="xs">
              {datos.motivos.map((opcion) => (
                <Radio.Card key={opcion.codigo} value={opcion.codigo} className={clases.opcion} disabled={enviando} radius="md">
                  <Group wrap="nowrap" gap="md">
                    <Radio.Indicator color="orange" />
                    <Text size="lg" fw={motivo === opcion.codigo ? 700 : 400}>{opcion.etiqueta}</Text>
                  </Group>
                </Radio.Card>
              ))}
            </Stack>
          </Radio.Group>

          <Paper withBorder radius="md" p="sm">
            <FileButton accept={POLITICA_EVIDENCIA.tiposPermitidos.join(',')} capture="environment" onChange={seleccionar} disabled={enviando}>
              {(propiedades) => evidencia.foto && miniatura ? (
                <Group wrap="nowrap" gap="md">
                  <Image src={miniatura} alt="Foto del domicilio" w={64} h={64} radius="sm" fit="cover" />
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={4} wrap="nowrap" align="flex-start">
                      <IconCircleCheck size={18} color="var(--ia-color-success-default)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                      <Text fw={700} size="sm" c="var(--ia-color-success-default)">Foto del domicilio lista</Text>
                    </Group>
                    <Text size="sm" c="var(--ia-color-text-secondary)">
                      {subiendo ? `Subiendo… ${evidencia.progreso ?? 0}%` : `Optimizada · ${formatearTamano(evidencia.foto.size)}`}
                    </Text>
                  </Stack>
                  <Button {...propiedades} variant="light" color="gray" size="sm" px="sm" leftSection={<IconRefresh size={16} />}>Repetir</Button>
                </Group>
              ) : (
                <Button {...propiedades} variant="subtle" fullWidth size="lg" h={72} loading={procesandoFoto}
                  leftSection={<IconCamera size={24} />}>
                  Tomar foto del domicilio
                </Button>
              )}
            </FileButton>
            {procesandoFoto && <Group gap="xs" mt="xs"><Loader size="xs" /><Text size="sm">Optimizando imagen…</Text></Group>}
          </Paper>
          {intentoEnvio && !evidencia.foto && !procesandoFoto && <Text size="sm" c="red.8">La foto del domicilio es obligatoria.</Text>}
          {evidencia.fase === 'error' && evidencia.error && <Text size="sm" c="red.8" role="alert">{evidencia.error}</Text>}

          <Textarea label="Comentario (opcional)" value={comentario} maxLength={MAXIMO_COMENTARIO} autosize minRows={2} maxRows={5}
            disabled={enviando} onChange={(evento) => setComentario(evento.currentTarget.value)}
            classNames={{ label: clases.etiquetaComentario }}
            description={<Text component="span" size="xs" className="ia-num">{comentario.length}/{MAXIMO_COMENTARIO}</Text>} />
          <Text size="sm" c="var(--ia-color-text-secondary)">
            Este intento contará como Intento {intentoEnCurso(datos.detalle.numeroIntentos, datos.detalle.estado)}
            {datos.detalle.maximoIntentos ? ` de ${datos.detalle.maximoIntentos}` : ''}.
          </Text>
          {error && <Alert color="red" icon={<IconAlertCircle size={18} />} title="No se registró el fallo" role="alert">{error}</Alert>}
        </Stack>
      )}
    </Pantalla>
  );
}
