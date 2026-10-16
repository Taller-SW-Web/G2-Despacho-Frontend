import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { TagsInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconArrowLeft, IconDeviceFloppy, IconLock } from '@tabler/icons-react';
import { useClienteApi } from '../../cliente/useClienteApi';
import { crearZona, editarZona, obtenerZona, problemaDe } from './api/zonasApi';
import { ModalConfirmacion } from './ModalConfirmacion';
import type { EstadoZona, SolicitudZona, Zona } from './tipos';

const esquema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(80, 'El nombre no puede superar 80 caracteres'),
  distritos: z.array(z.string()),
  codigosPostales: z.array(z.string()),
  estado: z.enum(['ACTIVO', 'INACTIVO']),
});

type ValoresFormulario = z.infer<typeof esquema>;

const VALORES_INICIALES: ValoresFormulario = {
  nombre: '',
  distritos: [],
  codigosPostales: [],
  estado: 'ACTIVO',
};

export function FormularioZona() {
  const cliente = useClienteApi();
  const navegar = useNavigate();
  const { id } = useParams<{ id: string }>();
  const esEdicion = Boolean(id);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ValoresFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: VALORES_INICIALES,
  });

  const [zonaActual, setZonaActual] = useState<Zona | null>(null);
  const [cargando, setCargando] = useState(esEdicion);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [denegado, setDenegado] = useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);

  useEffect(() => {
    if (!esEdicion || !id) return;
    let activo = true;
    setCargando(true);
    obtenerZona(cliente, id)
      .then((zona) => {
        if (!activo) return;
        setZonaActual(zona);
        reset({
          nombre: zona.nombre,
          distritos: zona.distritos.map((distrito) => distrito.nombre),
          codigosPostales: zona.codigosPostales,
          estado: zona.estado,
        });
      })
      .catch((error) => {
        if (!activo) return;
        const problema = problemaDe(error);
        if (problema?.status === 401 || problema?.status === 403) {
          setDenegado(true);
          return;
        }
        setErrorCarga('No se pudo cargar la zona. Revisa tu conexión e inténtalo de nuevo.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [cliente, esEdicion, id, reset]);

  const nombreValor = watch('nombre');
  const distritosValor = watch('distritos');
  const codigosValor = watch('codigosPostales');
  const delimitacionValida = distritosValor.length > 0 || codigosValor.length > 0;
  const formularioValido = nombreValor.trim() !== '' && delimitacionValida;

  const salir = () => navegar('/zonas');

  const solicitarCancelar = () => {
    if (isDirty) setConfirmarDescarte(true);
    else salir();
  };

  const guardar = handleSubmit(async (valores) => {
    setErrorGeneral(null);
    if (!delimitacionValida) {
      setError('distritos', {
        type: 'validacion',
        message: 'Selecciona al menos un distrito o código postal',
      });
      return;
    }
    const solicitud: SolicitudZona = {
      nombre: valores.nombre.trim(),
      estado: valores.estado,
      distritos: valores.distritos,
      codigosPostales: valores.codigosPostales,
    };
    try {
      const zona = esEdicion && id ? await editarZona(cliente, id, solicitud) : await crearZona(cliente, solicitud);
      notifications.show({
        message: esEdicion
          ? `Zona «${zona.nombre}» actualizada correctamente.`
          : `Zona «${zona.nombre}» registrada correctamente.`,
        color: 'teal',
        title: esEdicion ? 'Zona actualizada' : 'Zona registrada',
      });
      reset(valores);
      salir();
    } catch (error) {
      const problema = problemaDe(error);
      if (problema?.status === 401 || problema?.status === 403) {
        setDenegado(true);
        return;
      }
      if (problema?.status === 400 || problema?.status === 409) {
        const campos = ['nombre', 'distritos', 'codigosPostales', 'estado'] as const;
        problema.errores?.forEach(({ campo, motivo }) => {
          if ((campos as readonly string[]).includes(campo)) {
            setError(campo as (typeof campos)[number], { type: 'servidor', message: motivo });
          }
        });
        setErrorGeneral(problema.detail ?? 'La solicitud contiene campos inválidos.');
        return;
      }
      setErrorGeneral('No se pudo guardar la zona. Revisa tu conexión e inténtalo de nuevo.');
    }
  });

  if (denegado) {
    return (
      <Stack gap="md" maw={720}>
        <Title order={1}>Zonas de cobertura</Title>
        <Alert
          color="red"
          variant="light"
          icon={<IconLock size={18} />}
          title="No tienes permisos para configurar zonas"
        >
          Solicita acceso al rol GESTOR_DESPACHO para registrar o editar zonas.
        </Alert>
      </Stack>
    );
  }

  if (cargando) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <Stack gap="lg" maw={880}>
      <Breadcrumbs>
        <Text
          size="sm"
          c="dimmed"
          style={{ cursor: 'pointer' }}
          onClick={salir}
        >
          Zonas de cobertura
        </Text>
        <Text size="sm">{esEdicion ? `Editar ${zonaActual?.nombre ?? ''}` : 'Nueva zona'}</Text>
      </Breadcrumbs>

      <Title order={1}>{esEdicion ? 'Editar zona' : 'Nueva zona'}</Title>

      {errorCarga ? (
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
          {errorCarga}
        </Alert>
      ) : null}
      {errorGeneral ? (
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="No se pudo guardar">
          {errorGeneral}
        </Alert>
      ) : null}

      <Card>
        <form onSubmit={(evento) => void guardar(evento)}>
          <Stack gap="lg">
            <TextInput
              label="Nombre de la zona"
              placeholder="Lima Centro"
              withAsterisk
              maxLength={80}
              description="El nombre identifica la zona en el catálogo y no puede repetirse."
              error={errors.nombre?.message}
              {...register('nombre')}
            />

            <Controller
              control={control}
              name="distritos"
              render={({ field, fieldState }) => (
                <TagsInput
                  label="Distritos"
                  placeholder="Escribe un distrito y pulsa Enter"
                  withAsterisk
                  clearable
                  description="La cobertura se delimita por distritos y códigos postales; no se dibuja mapa."
                  error={fieldState.error?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="codigosPostales"
              render={({ field, fieldState }) => (
                <TagsInput
                  label="Códigos postales"
                  placeholder="Escribe un código postal y pulsa Enter"
                  clearable
                  error={fieldState.error?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            {esEdicion ? (
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  Estado
                </Text>
                <Group gap="sm">
                  <Badge color={zonaActual?.estado === 'ACTIVO' ? 'teal' : 'gray'} variant="light">
                    {zonaActual?.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    El estado se cambia desde el catálogo.
                  </Text>
                </Group>
              </Stack>
            ) : (
              <Controller
                control={control}
                name="estado"
                render={({ field, fieldState }) => (
                  <Select
                    label="Estado inicial"
                    data={[
                      { value: 'ACTIVO', label: 'Activo' },
                      { value: 'INACTIVO', label: 'Inactivo' },
                    ]}
                    allowDeselect={false}
                    error={fieldState.error?.message}
                    value={field.value as EstadoZona}
                    onChange={(valor) => field.onChange(valor ?? 'ACTIVO')}
                  />
                )}
              />
            )}

            <Text size="sm" c="dimmed">
              Cobertura seleccionada: {distritosValor.length} distrito(s) y {codigosValor.length}{' '}
              código(s) postal(es).
            </Text>

            <Group justify="space-between">
              <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={solicitarCancelar}>
                Cancelar
              </Button>
              <Button
                type="submit"
                leftSection={<IconDeviceFloppy size={18} />}
                loading={isSubmitting}
                disabled={!formularioValido}
              >
                Guardar zona
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <ModalConfirmacion
        abierto={confirmarDescarte}
        titulo="¿Descartar los cambios?"
        descripcion="Los datos ingresados no se guardarán."
        etiquetaConfirmar="Descartar"
        intencion="destructiva"
        alConfirmar={() => {
          setConfirmarDescarte(false);
          reset(VALORES_INICIALES);
          salir();
        }}
        alCancelar={() => setConfirmarDescarte(false)}
      />
    </Stack>
  );
}
