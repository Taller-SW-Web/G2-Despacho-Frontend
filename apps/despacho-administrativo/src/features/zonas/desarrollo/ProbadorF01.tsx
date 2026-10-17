import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Code, Group, NumberInput, PasswordInput, Select, SimpleGrid, Stack, Switch, Text, Textarea, TextInput, Title } from '@mantine/core';
import { EncabezadoPagina } from '@despacho/componentes-compartidos';
import { useSesion } from '../../../sesion/SesionProveedor';
import { emitirServicioLocal, emitirUsuarioLocal, probarCotizacion, type RespuestaPrueba } from './apiPruebas';
import { formatearFechaCivil, formatearMoneda } from '../utilidades';

type Linea = { sku: string; cantidad: number | string };
type DatosCotizacion = { coberturaDisponible: boolean; nombreZona?: string; costoEnvio?: number; moneda?: string; pesoTotalKg?: number; volumenTotalM3?: number; plazoEstimadoDiasHabiles?: number; fechaEstimadaEntrega?: string; mensaje?: string };

export default function ProbadorF01() {
  const sesion = useSesion();
  const [perfil, setPerfil] = useState('gestor');
  const [scope, setScope] = useState('cotizaciones:calcular');
  const [tokenHumano, setTokenHumano] = useState('');
  const [tokenServicio, setTokenServicio] = useState('');
  const [sesionLista, setSesionLista] = useState(Boolean(sesion.obtenerToken()));
  const [mensajeSesion, setMensajeSesion] = useState<string | null>(null);
  const [errorSesion, setErrorSesion] = useState<string | null>(null);
  const [emitiendo, setEmitiendo] = useState(false);
  const [distrito, setDistrito] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [direccion, setDireccion] = useState('');
  const [incluirLineas, setIncluirLineas] = useState(false);
  const [lineas, setLineas] = useState<Linea[]>([{ sku: 'POL-NEG-M', cantidad: 5 }, { sku: 'ZAP-RUN-42', cantidad: 1 }]);
  const [editarJson, setEditarJson] = useState(false);
  const [json, setJson] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorPrueba, setErrorPrueba] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaPrueba | null>(null);
  const [solicitudEnviada, setSolicitudEnviada] = useState<unknown>(null);
  const solicitud = {
    destino: { distrito: distrito.trim(), ...(codigoPostal.trim() ? { codigoPostal: codigoPostal.trim() } : {}), ...(direccion.trim() ? { direccion: direccion.trim() } : {}) },
    ...(incluirLineas ? { lineas: lineas.map((linea) => ({ sku: linea.sku.trim(), cantidad: Number(linea.cantidad) })) } : {}),
  };

  const generar = async (tipo: 'usuario' | 'servicio') => {
    setEmitiendo(true);
    setErrorSesion(null);
    try {
      const token = tipo === 'usuario' ? await emitirUsuarioLocal(perfil) : await emitirServicioLocal(scope);
      if (tipo === 'usuario') {
        sesion.guardarToken(token.accessToken);
        setSesionLista(true);
        setMensajeSesion(`Sesión ${perfil} preparada por ${Math.round(token.expiresIn / 60)} minutos. Ya puedes abrir Zonas y tarifas.`);
      } else {
        setTokenServicio(token.accessToken);
        setMensajeSesion(`Token de servicio preparado con scope ${scope}.`);
      }
    } catch (fallo) { setErrorSesion(fallo instanceof Error ? fallo.message : 'No se pudo preparar la sesión.'); }
    finally { setEmitiendo(false); }
  };
  const enviar = async () => {
    if (enviando) return;
    setErrorPrueba(null);
    setRespuesta(null);
    let cuerpo: unknown;
    try { cuerpo = editarJson ? JSON.parse(json) : solicitud; }
    catch { setErrorPrueba('El cuerpo no es un JSON válido. Corrígelo antes de enviar.'); return; }
    setSolicitudEnviada(cuerpo);
    setEnviando(true);
    try { setRespuesta(await probarCotizacion(tokenServicio, cuerpo)); }
    catch { setErrorPrueba('No se pudo contactar con el Gateway. Comprueba el backend en http://localhost:8080 y vuelve a enviar.'); }
    finally { setEnviando(false); }
  };
  const datos = respuesta?.status === 200 ? respuesta.cuerpo as DatosCotizacion : null;

  return <Stack gap="lg" maw={1100}>
    <EncabezadoPagina titulo="Probador local F-01" subtitulo="Zonas, tarifas, cobertura y cotización a través del API Gateway."
      acciones={<Button component={Link} to="/zonas">Abrir zonas y tarifas</Button>} />
    <Alert color="blue" title="Entorno de desarrollo">Las zonas y tarifas se guardan en Supabase. Los tokens son del emisor temporal de G2; los datos físicos de productos proceden del catálogo de prueba del backend.</Alert>
    <Card><Stack gap="md"><Title order={2}>1. Preparar sesión</Title>
      <Text size="sm">Genera una sesión de gestor para administrar zonas. Si vence, vuelve aquí y genera otra.</Text>
      {mensajeSesion && <Alert color="teal" role="status">{mensajeSesion}</Alert>}
      {errorSesion && <Alert color="red">{errorSesion}</Alert>}
      <Group align="flex-end"><Select label="Perfil humano de prueba" value={perfil} allowDeselect={false} onChange={(valor) => setPerfil(valor ?? 'gestor')}
        data={[{ value: 'gestor', label: 'Gestor de Despacho' }, { value: 'sin-rol', label: 'Usuario sin rol (probar 403)' }]} w={280} />
        <Button loading={emitiendo} onClick={() => void generar('usuario')}>Generar sesión de prueba</Button>
        <Badge color={sesionLista ? 'teal' : 'gray'}>{sesionLista ? 'Token humano cargado' : 'Sin sesión'}</Badge>
        <Button variant="default" disabled={emitiendo} onClick={() => { sesion.guardarToken(null); setSesionLista(false); setMensajeSesion('Sesión retirada. Las consultas administrativas responderán 401.'); }}>Retirar sesión</Button>
      </Group>
      <Group align="flex-end"><PasswordInput label="Token humano manual" placeholder="Pegar JWT humano" value={tokenHumano} onChange={(evento) => setTokenHumano(evento.currentTarget.value)} style={{ flex: 1 }} />
        <Button variant="light" disabled={!tokenHumano.trim()} onClick={() => { sesion.guardarToken(tokenHumano.trim()); setTokenHumano(''); setSesionLista(true); setMensajeSesion('Token humano aplicado.'); }}>Aplicar token humano</Button></Group>
    </Stack></Card>
    <Card><Stack gap="md"><Title order={2}>2. Preparar token de cotización</Title>
      <Text size="sm">La API de cotización requiere un token de servicio distinto de la sesión humana. Deja el campo vacío para comprobar el rechazo 401.</Text>
      <Group align="flex-end"><Select label="Scope del token de servicio" value={scope} allowDeselect={false} onChange={(valor) => setScope(valor ?? 'cotizaciones:calcular')}
        data={[{ value: 'cotizaciones:calcular', label: 'cotizaciones:calcular' }, { value: 'seguimientos:leer', label: 'seguimientos:leer (probar 403)' }]} w={320} />
        <Button variant="light" loading={emitiendo} onClick={() => void generar('servicio')}>Generar token de servicio</Button></Group>
      <PasswordInput label="Token de servicio" value={tokenServicio} onChange={(evento) => setTokenServicio(evento.currentTarget.value)} placeholder="Genera o pega un JWT técnico" />
    </Stack></Card>
    <Card><Stack gap="md"><Title order={2}>3. Consultar cobertura o cotizar</Title>
      <SimpleGrid cols={{ base: 1, sm: 3 }}><TextInput label="Distrito de destino" placeholder="Distrito de una zona activa" value={distrito} onChange={(evento) => setDistrito(evento.currentTarget.value)} />
        <TextInput label="Código postal de destino" value={codigoPostal} onChange={(evento) => setCodigoPostal(evento.currentTarget.value)} />
        <TextInput label="Dirección de destino" value={direccion} onChange={(evento) => setDireccion(evento.currentTarget.value)} /></SimpleGrid>
      <Switch label="Incluir productos para calcular el costo" checked={incluirLineas} onChange={(evento) => setIncluirLineas(evento.currentTarget.checked)} />
      {incluirLineas && <Stack gap="sm"><Text size="sm">SKU de prueba disponibles: POL-NEG-M y ZAP-RUN-42. Puedes introducir otro SKU para verificar el error de producto inexistente.</Text>
        {lineas.map((linea, indice) => <Group key={indice} align="flex-end">
          <TextInput label={`SKU ${indice + 1}`} value={linea.sku} onChange={(evento) => { const sku = evento.currentTarget.value; setLineas((actual) => actual.map((entrada, posicion) => posicion === indice ? { ...entrada, sku } : entrada)); }} style={{ flex: 1 }} />
          <NumberInput label={`Cantidad ${indice + 1}`} value={linea.cantidad} decimalScale={0} onChange={(cantidad) => setLineas((actual) => actual.map((entrada, posicion) => posicion === indice ? { ...entrada, cantidad } : entrada))} w={150} />
          <Button variant="subtle" color="red" aria-label={`Quitar producto ${indice + 1}`} onClick={() => setLineas((actual) => actual.filter((_, posicion) => posicion !== indice))}>Quitar</Button>
        </Group>)}<Button variant="light" onClick={() => setLineas((actual) => [...actual, { sku: '', cantidad: 1 }])}>Agregar producto</Button></Stack>}
      <Switch label="Editar JSON para probar errores de la API" checked={editarJson} onChange={(evento) => { setEditarJson(evento.currentTarget.checked); setJson(JSON.stringify(solicitud, null, 2)); }} />
      {editarJson ? <Textarea label="Cuerpo JSON editable" autosize minRows={8} value={json} onChange={(evento) => setJson(evento.currentTarget.value)} styles={{ input: { fontFamily: 'monospace' } }} />
        : <Code block aria-label="Solicitud preparada">{JSON.stringify(solicitud, null, 2)}</Code>}
      <Text size="sm" c="dimmed">Sin productos se resuelve la cobertura. Una zona activa sin tarifa confirma cobertura, pero no devuelve costo ni plazo.</Text>
      <Button loading={enviando} onClick={() => void enviar()}>Enviar consulta F-01</Button>
      {errorPrueba && <Alert color="red">{errorPrueba}</Alert>}
    </Stack></Card>
    {respuesta && <Card><Stack gap="md"><Group justify="space-between"><Title order={2}>Resultado de la API</Title><Badge color={respuesta.status < 400 ? 'teal' : 'red'} size="lg">HTTP {respuesta.status}</Badge></Group>
      {datos && <><Alert color={datos.coberturaDisponible ? 'teal' : 'orange'} title={datos.coberturaDisponible ? 'Destino con cobertura' : 'Destino sin cobertura'}>{datos.nombreZona ?? datos.mensaje}</Alert>
        {datos.costoEnvio != null ? <SimpleGrid cols={{ base: 1, sm: 3 }}><Text>Costo: <strong>{formatearMoneda(datos.costoEnvio, datos.moneda)}</strong></Text>
          <Text>Peso total: {datos.pesoTotalKg} kg</Text><Text>Volumen: {datos.volumenTotalM3} m³</Text><Text>Plazo: {datos.plazoEstimadoDiasHabiles} días hábiles</Text><Text>Entrega estimada: {formatearFechaCivil(datos.fechaEstimadaEntrega)}</Text></SimpleGrid>
          : <Text>No se devolvió costo ni plazo para esta consulta.</Text>}</>}
      <Text fw={600}>Solicitud enviada · POST /api/v1/cotizaciones</Text><Code block>{JSON.stringify(solicitudEnviada, null, 2)}</Code>
      <Text fw={600}>Respuesta recibida</Text><Code block aria-label="Respuesta JSON">{JSON.stringify(respuesta.cuerpo, null, 2)}</Code>
    </Stack></Card>}
  </Stack>;
}
