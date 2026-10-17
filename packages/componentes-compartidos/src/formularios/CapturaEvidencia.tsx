import { useEffect, useState } from 'react';
import { Alert, Button, FileButton, Group, Image, Loader, Paper, Progress, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconCamera, IconPhoto } from '@tabler/icons-react';

export type PoliticaArchivoEvidencia = {
  tiposPermitidos: string[];
  maximoBytes: number;
};

export type FaseCapturaEvidencia = 'vacia' | 'lista' | 'procesando' | 'subiendo' | 'cargada' | 'error';

export type CapturaEvidenciaProps = {
  archivo: File | null;
  descripcionFoto: string;
  fase: FaseCapturaEvidencia;
  politicaArchivo: PoliticaArchivoEvidencia | null;
  progreso?: number | null;
  error?: string;
  disabled?: boolean;
  obligatoria?: boolean;
  alSeleccionar: (archivo: File) => void;
  alVolverATomar: () => void;
  alReintentar: () => void;
};

export function CapturaEvidencia({
  archivo,
  descripcionFoto,
  fase,
  politicaArchivo,
  progreso = null,
  error,
  disabled = false,
  obligatoria = true,
  alSeleccionar,
  alVolverATomar,
  alReintentar,
}: CapturaEvidenciaProps) {
  const [urlPrevisualizacion, setUrlPrevisualizacion] = useState<string | null>(null);

  useEffect(() => {
    if (!archivo) {
      setUrlPrevisualizacion(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setUrlPrevisualizacion(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const capturaDeshabilitada = disabled || !politicaArchivo;
  const aceptados = politicaArchivo?.tiposPermitidos.join(',');

  return (
    <Stack gap="sm">
      <Paper
        withBorder
        p="sm"
        radius="lg"
        style={{
          aspectRatio: '4 / 3',
          borderStyle: archivo ? 'solid' : 'dashed',
          borderColor: fase === 'error' ? 'var(--mantine-color-error)' : undefined,
          overflow: 'hidden',
        }}
      >
        {archivo && urlPrevisualizacion ? (
          <Stack h="100%" justify="space-between">
            <Image
              src={urlPrevisualizacion}
              alt={descripcionFoto}
              fit="cover"
              h="calc(100% - 48px)"
              radius="md"
            />
            <FileButton
              accept={aceptados}
              capture="environment"
              disabled={capturaDeshabilitada}
              onChange={(seleccion) => {
                if (seleccion) alSeleccionar(seleccion);
              }}
            >
              {(props) => (
                <Button
                  {...props}
                  type="button"
                  disabled={capturaDeshabilitada}
                  variant="subtle"
                  size="md"
                  fullWidth
                  leftSection={<IconCamera size={20} />}
                  onClick={() => {
                    alVolverATomar();
                    props.onClick?.();
                  }}
                >
                  Volver a tomar
                </Button>
              )}
            </FileButton>
          </Stack>
        ) : (
          <FileButton
            accept={aceptados}
            capture="environment"
            disabled={capturaDeshabilitada}
            onChange={(seleccion) => {
              if (seleccion) alSeleccionar(seleccion);
            }}
          >
            {(props) => (
              <Button
                {...props}
                type="button"
                disabled={capturaDeshabilitada}
                variant="subtle"
                fullWidth
                h="100%"
                style={{ whiteSpace: 'normal' }}
                leftSection={<IconCamera size={22} />}
                aria-label="Tomar foto"
              >
                <Stack gap={4} align="center">
                  <Text fw={700}>Tomar foto</Text>
                  <Text size="sm" fw={400}>{obligatoria ? 'Foto obligatoria como evidencia' : 'Agregar evidencia fotográfica'}</Text>
                </Stack>
              </Button>
            )}
          </FileButton>
        )}
      </Paper>

      {!politicaArchivo && (
        <Alert icon={<IconAlertCircle size={18} />} color="yellow" title="Captura no disponible">
          La política de archivo debe acordarse antes de habilitar la selección o carga de evidencia.
        </Alert>
      )}

      {fase === 'lista' && archivo && (
        <Text size="sm" role="status">Foto seleccionada; todavía no se ha cargado.</Text>
      )}
      {fase === 'cargada' && archivo && (
        <Text size="sm" c="green.8" role="status">Foto cargada. Aún falta confirmar el resultado del despacho.</Text>
      )}
      {(fase === 'procesando' || fase === 'subiendo') && (
        <Group gap="sm" role="status" aria-live="polite">
          {progreso === null ? <Loader size="sm" /> : <Progress value={Math.min(100, Math.max(0, progreso))} flex={1} />}
          <Text size="sm">{fase === 'procesando' ? 'Optimizando imagen…' : 'Cargando evidencia…'}</Text>
        </Group>
      )}
      {fase === 'error' && (
        <Alert icon={<IconAlertCircle size={18} />} color="red" title="No se pudo cargar la evidencia">
          <Stack gap="xs">
            <Text size="sm">{error || 'Inténtalo de nuevo. La foto seleccionada se conserva.'}</Text>
            <Button
              type="button"
              variant="outline"
              size="md"
              leftSection={<IconPhoto size={18} />}
              onClick={alReintentar}
              disabled={!archivo || disabled || !politicaArchivo}
            >
              Reintentar
            </Button>
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
