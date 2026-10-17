import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ActionIcon, Alert, Button, Checkbox, Container, Group, MantineProvider, MultiSelect, NumberInput, Paper, PasswordInput, Radio, Select, Stack, Switch, TagsInput, Text, Textarea, TextInput, Title } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconRefresh } from '@tabler/icons-react';
import { accionesIconoUi, accionesUi, BarraAccionesFija, camposFormulario, tema } from '@despacho/componentes-compartidos';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@despacho/componentes-compartidos/tokens.css';

function EjemploControlesValqui() {
  const [nombre, cambiarNombre] = useState('');
  const [importe, cambiarImporte] = useState<string | number>('');
  const [fecha, cambiarFecha] = useState<string | null>(null);
  const [sello, cambiarSello] = useState('');
  const [distritos, cambiarDistritos] = useState<string[]>([]);
  const [codigos, cambiarCodigos] = useState<string[]>([]);
  const [comentario, cambiarComentario] = useState('');
  const [bloqueada, bloquear] = useState(true);
  const [destructiva, cambiarDestructiva] = useState(false);
  const [simularError, cambiarSimularError] = useState(true);
  const [procesando, procesar] = useState(false);
  const [errores, cambiarErrores] = useState<Record<string, string>>({});
  const [errorOperacion, cambiarErrorOperacion] = useState('');
  const [resultado, cambiarResultado] = useState('Ninguna operación simulada enviada.');
  const [envios, cambiarEnvios] = useState(0);
  const enviando = useRef(false);
  const temporizador = useRef<number | undefined>(undefined);
  const formulario = useRef<HTMLFormElement>(null);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  function limpiarError(campo: string) {
    cambiarErrores((anteriores) => { const copia = { ...anteriores }; delete copia[campo]; return copia; });
  }

  function guardar() {
    if (enviando.current || bloqueada) return;
    const nuevos: Record<string, string> = {};
    if (!nombre.trim()) nuevos.nombre = 'Ingresa el nombre de la zona.';
    if (typeof importe !== 'number' || !Number.isFinite(importe) || importe < 0) nuevos.importe = 'Ingresa un importe igual o mayor que cero.';
    if (!fecha) nuevos.fecha = 'Selecciona una fecha para el ejemplo.';
    if (sello === '') nuevos.sello = 'Indica si el sello está intacto: Sí o No.';
    cambiarErrores(nuevos);
    cambiarErrorOperacion('');
    if (Object.keys(nuevos).length) {
      const control = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      // El foco se establece tras renderizar los mensajes asociados.
      temporizador.current = window.setTimeout(() => {
        (formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? control)?.focus();
      }, 0);
      return;
    }
    // El contenedor bloquea antes de iniciar la petición; la barra solo solicita la acción.
    enviando.current = true;
    procesar(true);
    cambiarEnvios((cantidad) => cantidad + 1);
    temporizador.current = window.setTimeout(() => {
      enviando.current = false;
      procesar(false);
      if (simularError) cambiarErrorOperacion('No pudimos guardar los datos de prueba. Se conservaron los valores; puedes reintentar.');
      else cambiarResultado(`Operación simulada completada: ${nombre}, PEN ${Number(importe).toFixed(2)}, fecha civil ${fecha}, sello ${sello === 'si' ? 'intacto' : 'no intacto'}.`);
    }, 2500);
  }

  return <Container component="main" size="md" py="xl">
    <Stack gap="lg">
      <div>
        <Title order={1}>Controles compartidos · Valqui</Title>
        <Text>CR-01 AccionesUi · CR-02 CamposFormulario · CR-13 BarraAccionesFija</Text>
        <Text size="sm" c="dimmed">Ejemplo de desarrollo con datos y operaciones simulados. Combina controles de distintas funcionalidades para revisar sus patrones.</Text>
      </div>
      <Paper withBorder p="md">
        <Stack gap="md">
          <Title order={2}>Estados de prueba</Title>
          <Switch label="Bloquear acción principal con motivo largo" checked={bloqueada} disabled={procesando} onChange={(evento) => bloquear(evento.currentTarget.checked)} />
          <Switch label="Usar intención destructiva" checked={destructiva} disabled={procesando} onChange={(evento) => cambiarDestructiva(evento.currentTarget.checked)} />
          <Switch label="Simular error al guardar" checked={simularError} disabled={procesando} onChange={(evento) => cambiarSimularError(evento.currentTarget.checked)} />
          <Text role="status">Envíos simulados: {envios}. {resultado}</Text>
          <Group>
            <Button {...accionesUi.secundaria} type="button" onClick={() => cambiarResultado('Se solicitó la acción secundaria de prueba.')}>Acción secundaria</Button>
            <Button {...accionesUi.terciaria} type="button" onClick={() => cambiarResultado('Se solicitó la acción terciaria de prueba.')}>Acción terciaria</Button>
            <ActionIcon {...accionesIconoUi.movil} type="button" aria-label="Actualizar ejemplo" onClick={() => cambiarResultado('Ejemplo actualizado localmente.')}><IconRefresh size={20} aria-hidden="true" /></ActionIcon>
          </Group>
        </Stack>
      </Paper>
      <form ref={formulario} noValidate onSubmit={(evento) => { evento.preventDefault(); guardar(); }}>
        <Stack gap="lg">
          <Title order={2}>Campos con estado controlado</Title>
          {errorOperacion && <Alert color="red.8" title="No se completó la simulación">{errorOperacion}</Alert>}
          <TextInput id="ejemplo-nombre" size="lg" label="Nombre de zona" required value={nombre} error={errores.nombre} onChange={(evento) => { cambiarNombre(evento.currentTarget.value); limpiarError('nombre'); }} />
          <TextInput id="ejemplo-dni" size="lg" label="DNI de solo lectura" value="12345678" readOnly description="El DNI no se puede modificar." />
          <PasswordInput id="ejemplo-clave" size="lg" label="Contraseña de prueba" visibilityToggleButtonProps={{ 'aria-label': 'Mostrar u ocultar contraseña' }} autoComplete="new-password" />
          <NumberInput {...camposFormulario.moneda} id="ejemplo-importe" size="lg" label="Tarifa base de prueba" description="El campo empieza vacío. Cero es un valor válido en esta demostración." required min={0} allowNegative={false} value={importe} error={errores.importe} onChange={(nuevo) => { cambiarImporte(nuevo); limpiarError('importe'); }} />
          <Select {...camposFormulario.seleccion} id="ejemplo-zona" size="lg" label="Zona de prueba" data={['Comas', 'Los Olivos', 'Independencia', 'San Martín de Porres', 'Puente Piedra', 'Carabayllo', 'Ancón', 'Santa Rosa', 'Lima']} searchable clearable clearButtonProps={{ 'aria-label': 'Limpiar zona de prueba' }} />
          <MultiSelect id="ejemplo-distritos" size="lg" label="Distritos de prueba" data={['Comas', 'Los Olivos', 'Independencia']} searchable clearable clearButtonProps={{ 'aria-label': 'Limpiar distritos de prueba' }} value={distritos} onChange={cambiarDistritos} />
          <TagsInput id="ejemplo-codigos" size="lg" label="Códigos de prueba" description="Escribe un código y presiona Enter." value={codigos} onChange={cambiarCodigos} />
          <DatePickerInput {...camposFormulario.fecha} id="ejemplo-fecha" size="lg" label="Fecha programada de prueba" required value={fecha} error={errores.fecha} onChange={(nueva) => { cambiarFecha(nueva); limpiarError('fecha'); }} />
          <Radio.Group id="ejemplo-sello" label="Sello intacto" required value={sello} error={errores.sello} onChange={(nuevo) => { cambiarSello(nuevo); limpiarError('sello'); }}>
            <Stack gap="sm" mt="sm"><Radio size="lg" value="si" label="Sí" /><Radio size="lg" value="no" label="No" /></Stack>
          </Radio.Group>
          <Checkbox size="lg" label="Opción independiente de prueba" />
          <Textarea {...camposFormulario.comentario} id="ejemplo-comentario" size="lg" label="Último campo: observaciones" description="Comprueba que este campo y su error queden por encima de la barra al desplazarte hasta el final." maxLength={250} value={comentario} onChange={(evento) => cambiarComentario(evento.currentTarget.value)} error={comentario === 'error' ? 'Mensaje de error de prueba del último campo.' : undefined} />
          <Text size="sm">{comentario.length}/250 · Escribe «error» para comprobar el mensaje del último campo.</Text>
          <BarraAccionesFija
            principal={{ id: 'guardar', etiqueta: destructiva ? 'Cerrar prueba' : 'Guardar prueba', disabled: bloqueada, loading: procesando, motivoDeshabilitado: bloqueada ? 'La acción está bloqueada por una regla de prueba. Desactiva el bloqueo y completa los campos obligatorios. Este mensaje largo permite comprobar que la reserva inferior crece sin ocultar el último campo ni sus errores.' : undefined }}
            secundaria={{ id: 'cancelar', etiqueta: 'Cancelar', disabled: procesando }}
            intencionPrincipal={destructiva ? 'destructiva' : 'principal'}
            alAccionar={(id) => {
              if (id === 'guardar') formulario.current?.requestSubmit();
              else cambiarResultado('Se solicitó cancelar sin enviar el formulario.');
            }}
          />
        </Stack>
      </form>
    </Stack>
  </Container>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><MantineProvider theme={tema}><EjemploControlesValqui /></MantineProvider></StrictMode>);
