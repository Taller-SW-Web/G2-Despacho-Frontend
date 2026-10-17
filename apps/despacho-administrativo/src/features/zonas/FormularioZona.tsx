import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button, Card, Fieldset, Group, Loader, MultiSelect, Select, Stack, TagsInput, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { BadgeEstado, BarraAccionesFija, EncabezadoPagina, ModalConfirmacion } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { crearZona, detalleProblema, editarZona, obtenerZona, problemaDe } from './api/zonasApi';
import { useDistritos } from './useDistritos';
import type { SolicitudZona, Zona } from './tipos';

const esquema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'El nombre no puede superar 80 caracteres'),
  distritos: z.array(z.object({ distrito: z.string().min(1), codigosPostales: z.array(z.string()) }))
    .min(1, 'Selecciona al menos un distrito'),
  estado: z.enum(['ACTIVO', 'INACTIVO']),
});
type ValoresFormulario = z.infer<typeof esquema>;
const VALORES_INICIALES: ValoresFormulario = { nombre: '', distritos: [], estado: 'ACTIVO' };

export function FormularioZona() {
  const cliente = useClienteApi();
  const navegar = useNavigate();
  const { id } = useParams<{ id: string }>();
  const esEdicion = Boolean(id);
  const catalogo = useDistritos();
  const { register, control, handleSubmit, reset, watch, setError, formState: { errors, isDirty, isSubmitting } } = useForm<ValoresFormulario>({
    resolver: zodResolver(esquema), defaultValues: VALORES_INICIALES,
  });
  const [zonaActual, setZonaActual] = useState<Zona | null>(null);
  const [cargando, setCargando] = useState(esEdicion);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [denegado, setDenegado] = useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let activo = true;
    setErrorCarga(null);
    setDenegado(false);
    setZonaActual(null);
    reset(VALORES_INICIALES);
    if (!id) { setCargando(false); return; }
    setCargando(true);
    obtenerZona(cliente, id).then((zona) => {
      if (!activo) return;
      setZonaActual(zona);
      reset({ nombre: zona.nombre, estado: zona.estado, distritos: zona.distritos.map((distrito) => ({
        distrito: distrito.nombre, codigosPostales: distrito.codigosPostales,
      })) });
    }).catch((fallo) => {
      if (!activo) return;
      const status = problemaDe(fallo)?.status;
      setDenegado(status === 401 || status === 403);
      setErrorCarga(status === 404 ? 'La zona solicitada no existe.' : 'No se pudo cargar la zona. Revisa tu conexión e inténtalo de nuevo.');
    }).finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [cliente, id, reset, revision]);

  const valores = watch();
  const motivoBloqueo = !valores.nombre.trim() ? 'Ingresa el nombre de la zona.'
    : !valores.distritos.length ? 'Selecciona al menos un distrito.'
    : catalogo.cargando || catalogo.error ? 'Espera a que el catálogo de distritos esté disponible.' : undefined;
  const salir = () => navegar('/zonas');
  const solicitarCancelar = () => { if (isDirty) setConfirmarDescarte(true); else salir(); };

  const guardar = handleSubmit(async (datos) => {
    if (isSubmitting || catalogo.error || catalogo.cargando) return;
    setErrorGeneral(null);
    const solicitud: SolicitudZona = {
      ...datos,
      distritos: datos.distritos.map((distrito) => ({
        distrito: distrito.distrito,
        codigosPostales: [...new Set(distrito.codigosPostales.map((codigo) => codigo.trim()).filter(Boolean))],
      })),
    };
    try {
      const zona = id ? await editarZona(cliente, id, solicitud) : await crearZona(cliente, solicitud);
      notifications.show({ title: esEdicion ? 'Zona actualizada' : 'Zona registrada', color: 'green',
        message: <Stack gap="xs"><Text size="sm">Zona «{zona.nombre}» {esEdicion ? 'actualizada' : 'registrada'} correctamente.</Text>
          {zona.estado === 'ACTIVO' && <Button size="xs" variant="light" onClick={() => navegar(`/zonas/${zona.id}/tarifas`)}>Configurar tarifas</Button>}</Stack>,
      });
      reset(datos);
      salir();
    } catch (fallo) {
      const problema = problemaDe(fallo);
      if (problema?.status === 401 || problema?.status === 403) { setDenegado(true); return; }
      problema?.errores?.forEach(({ campo, motivo }) => {
        if (campo === 'nombre' || campo === 'distritos' || campo === 'estado') setError(campo, { type: 'servidor', message: motivo });
      });
      setErrorGeneral(detalleProblema(fallo, 'No se pudo guardar la zona. Revisa tu conexión e inténtalo de nuevo.'));
    }
  });

  if (denegado || catalogo.denegado) return <Stack><Title order={1}>Zonas de cobertura</Title>
    <Alert color="red" title="No tienes permisos para configurar zonas">Necesitas una sesión vigente con rol GESTOR_DESPACHO.</Alert></Stack>;
  if (cargando) return <Group justify="center" py="xl"><Loader aria-label="Cargando zona" /></Group>;
  if (errorCarga) return <Stack><Title order={1}>Editar zona</Title><Alert color="red">{errorCarga}</Alert>
    <Group><Button onClick={() => setRevision((valor) => valor + 1)}>Reintentar</Button><Button variant="default" onClick={salir}>Volver a zonas</Button></Group></Stack>;

  return <Stack gap="lg" maw={880}>
    <EncabezadoPagina titulo={esEdicion ? 'Editar zona' : 'Nueva zona'} subtitulo="Configura la cobertura por distrito y sus códigos postales."
      migas={[{ id: 'zonas', ruta: '/zonas', etiqueta: 'Zonas de cobertura' }, { id: 'formulario', ruta: '#', etiqueta: esEdicion ? `Editar ${zonaActual?.nombre ?? ''}` : 'Nueva zona' }]}
      alNavegarMiga={({ ruta }) => navegar(ruta)} />
    {errorGeneral && <Alert color="red" title="No se pudo guardar">{errorGeneral}</Alert>}
    {catalogo.error && <Alert color="red" title="Catálogo no disponible"><Stack gap="xs"><Text size="sm">{catalogo.error}</Text>
      <Button size="xs" onClick={catalogo.reintentar}>Reintentar catálogo</Button></Stack></Alert>}
    <Card>
      <form onSubmit={(evento) => void guardar(evento)}>
        <Fieldset variant="unstyled" disabled={isSubmitting}>
          <Stack gap="lg">
            <TextInput label="Nombre de la zona" placeholder="Lima Centro" withAsterisk maxLength={80}
              description="El nombre identifica la zona en el catálogo y no puede repetirse." error={errors.nombre?.message} {...register('nombre')} />
            <Controller name="distritos" control={control} render={({ field, fieldState }) => <Stack gap="md">
              <MultiSelect label="Distritos" placeholder={catalogo.cargando ? 'Cargando distritos…' : 'Selecciona uno o varios distritos'} withAsterisk searchable clearable
                disabled={catalogo.cargando || Boolean(catalogo.error)} nothingFoundMessage="No se encontraron distritos"
                data={catalogo.distritos.map((distrito) => ({ value: distrito.nombre, label: `${distrito.nombre} · ${distrito.provincia}` }))}
                value={field.value.map(({ distrito }) => distrito)}
                onChange={(nombres) => field.onChange(nombres.map((nombre) => field.value.find(({ distrito }) => distrito === nombre) ?? { distrito: nombre, codigosPostales: [] }))}
                error={fieldState.error?.message} description="Seleccionar un distrito cubre todo su territorio; los códigos postales no restringen esa cobertura." />
              {field.value.map((entrada, indice) => <TagsInput key={entrada.distrito} label={`Códigos postales de ${entrada.distrito}`}
                description="Opcional. Escribe cada código y pulsa Enter. Se asociará a este distrito."
                placeholder="Ej. 15311" clearable value={entrada.codigosPostales}
                onChange={(codigosPostales) => field.onChange(field.value.map((actual, posicion) => posicion === indice ? { ...actual, codigosPostales } : actual))} />)}
            </Stack>} />
            {esEdicion ? <Stack gap={4}><Text size="sm" fw={500}>Estado</Text><Group>
              <BadgeEstado contexto="zona" valor={zonaActual?.estado} />
              <Text size="sm" c="dimmed">El estado se cambia desde el catálogo.</Text></Group></Stack>
              : <Controller name="estado" control={control} render={({ field }) => <Select label="Estado inicial"
                data={[{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]} allowDeselect={false} value={field.value} onChange={(valor) => field.onChange(valor ?? 'ACTIVO')} />} />}
            <Text size="sm" c="dimmed">Cobertura seleccionada: {valores.distritos.length} distrito(s) y {valores.distritos.reduce((total, distrito) => total + distrito.codigosPostales.length, 0)} código(s) postal(es).</Text>
          </Stack>
        </Fieldset>
      </form>
    </Card>
    <BarraAccionesFija principal={{ id: 'guardar', etiqueta: 'Guardar zona', loading: isSubmitting, disabled: Boolean(motivoBloqueo), motivoDeshabilitado: motivoBloqueo }}
      secundaria={{ id: 'cancelar', etiqueta: 'Cancelar', disabled: isSubmitting }} alAccionar={(accion) => { if (accion === 'guardar') void guardar(); else solicitarCancelar(); }} />
    <ModalConfirmacion abierto={confirmarDescarte} titulo="¿Descartar los cambios?" descripcion="Los datos ingresados no se guardarán." etiquetaConfirmar="Descartar" intencion="destructiva"
      alConfirmar={() => { reset(VALORES_INICIALES); salir(); }} alCancelar={() => setConfirmarDescarte(false)} />
  </Stack>;
}
