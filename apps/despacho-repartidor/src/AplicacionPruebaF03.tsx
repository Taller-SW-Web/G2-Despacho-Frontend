import { createContext, useContext, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Alert, Button, Card, Group, Image, PasswordInput,
  Select, SimpleGrid, Stack, Text, TextInput, Textarea, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconClipboardList, IconDoorExit, IconRoute } from '@tabler/icons-react';
import {
  BadgeEstado, CapturaEvidencia, ModalConfirmacion, ShellRepartidor, TarjetaDespacho, TarjetaKpi, logoInkaAthletics,
} from '@despacho/componentes-compartidos';
import type { DestinoRepartidor, FaseCapturaEvidencia } from '@despacho/componentes-compartidos';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

const usuarioPrueba = 'repartidor.prueba';
const clavePrueba = 'Ruta2026!';
const idJornada = '00000000-0000-4000-8000-000000000016';
const fecha = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const idDemo = (numero: number) => `00000000-0000-4000-8000-${String(numero).padStart(12, '0')}`;
const imagenPrueba = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#EDEAE2"/><path d="M0 350L170 190l115 105 105-135 250 190v130H0" fill="#EEF7B0"/><circle cx="500" cy="105" r="48" fill="#FFC078"/><text x="32" y="440" font-family="sans-serif" font-size="24" fill="#1B1812">Evidencia de prueba</text></svg>',
)}`;

type MotivoFallo =
  | 'CLIENTE_AUSENTE'
  | 'DIRECCION_NO_UBICADA'
  | 'RECHAZO_DEL_PAQUETE'
  | 'DATOS_DE_CONTACTO_ERRONEOS'
  | 'ZONA_INACCESIBLE'
  | 'PAQUETE_DANADO'
  | 'NO_INTENTADO';

type EstadoDespacho = 'ASIGNADO' | 'EN_CAMINO' | 'ENTREGADO' | 'FALLIDO';
type MotivoCampo = Exclude<MotivoFallo, 'NO_INTENTADO'>;
type DespachoPrueba = {
  id: string;
  codigo: string;
  estado: EstadoDespacho;
  secuencia: number;
  intentos: number;
  maximoIntentos: number;
  fechaProgramada: string;
  destinatario: string;
  telefono: string;
  direccion: string;
  referencia: string;
  distrito: string;
  motivo: MotivoFallo | null;
  comentario: string | null;
  recibidoPor: string | null;
  evidenciaUrl: string | null;
};

type DatosPrueba = {
  despachos: DespachoPrueba[];
  jornadaCerrada: boolean;
  operador: string;
};

type AlmacenPrueba = {
  datos: DatosPrueba;
  despacho: (id: string) => DespachoPrueba | undefined;
  iniciarTraslado: (id: string) => void;
  entregar: (id: string, recibidoPor: string, evidenciaUrl: string) => void;
  fallar: (id: string, motivo: MotivoCampo, comentario: string, evidenciaUrl: string) => void;
  cerrarJornada: () => string[];
};

const ContextoPrueba = createContext<AlmacenPrueba | null>(null);

function despachosIniciales(): DespachoPrueba[] {
  return [
    {
      id: idDemo(17), codigo: 'TRK-2026-0017', estado: 'ASIGNADO', secuencia: 1, intentos: 0, maximoIntentos: 2,
      fechaProgramada: fecha, destinatario: 'Ana Mendoza', telefono: '+51 900 000 101',
      direccion: 'Av. Arequipa 1420', referencia: 'Edificio Los Olivos, recepción', distrito: 'Miraflores',
      motivo: null, comentario: null, recibidoPor: null, evidenciaUrl: null,
    },
    {
      id: idDemo(18), codigo: 'TRK-2026-0018', estado: 'ASIGNADO', secuencia: 2, intentos: 0, maximoIntentos: 2,
      fechaProgramada: fecha, destinatario: 'Luis Paredes', telefono: '+51 900 000 102',
      direccion: 'Jr. Junín 330', referencia: 'Casa azul, puerta de madera', distrito: 'Cercado de Lima',
      motivo: null, comentario: null, recibidoPor: null, evidenciaUrl: null,
    },
    {
      id: idDemo(19), codigo: 'TRK-2026-0019', estado: 'EN_CAMINO', secuencia: 3, intentos: 0, maximoIntentos: 2,
      fechaProgramada: fecha, destinatario: 'Camila Torres', telefono: '+51 900 000 103',
      direccion: 'Calle Los Olivos 250', referencia: 'Torre B, departamento 402', distrito: 'San Isidro',
      motivo: null, comentario: null, recibidoPor: null, evidenciaUrl: null,
    },
    {
      id: idDemo(20), codigo: 'TRK-2026-0020', estado: 'ENTREGADO', secuencia: 4, intentos: 1, maximoIntentos: 2,
      fechaProgramada: fecha, destinatario: 'Diego Salazar', telefono: '+51 900 000 104',
      direccion: 'Av. La Marina 890', referencia: 'Local 12', distrito: 'San Miguel',
      motivo: null, comentario: null, recibidoPor: 'Diego Salazar', evidenciaUrl: imagenPrueba,
    },
    {
      id: idDemo(21), codigo: 'TRK-2026-0021', estado: 'FALLIDO', secuencia: 5, intentos: 1, maximoIntentos: 2,
      fechaProgramada: fecha, destinatario: 'Valeria Rojas', telefono: '+51 900 000 105',
      direccion: 'Jr. Las Gardenias 415', referencia: 'Tocar el timbre del segundo piso', distrito: 'Surco',
      motivo: 'CLIENTE_AUSENTE', comentario: 'No hubo respuesta al llamar.', recibidoPor: null, evidenciaUrl: imagenPrueba,
    },
  ];
}

function ProveedorPrueba({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<DatosPrueba>(() => ({
    despachos: despachosIniciales(),
    jornadaCerrada: false,
    operador: 'María Fernanda Ríos',
  }));
  const valor = useMemo<AlmacenPrueba>(() => {
    const actualizarDespacho = (id: string, actualizar: (despacho: DespachoPrueba) => DespachoPrueba) => {
      setDatos((actual) => ({
        ...actual,
        despachos: actual.despachos.map((despacho) => despacho.id === id ? actualizar(despacho) : despacho),
      }));
    };
    return {
      datos,
      despacho: (id) => datos.despachos.find((despacho) => despacho.id === id),
      iniciarTraslado: (id) => actualizarDespacho(id, (despacho) => (
        !datos.jornadaCerrada && despacho.estado === 'ASIGNADO'
          ? { ...despacho, estado: 'EN_CAMINO' }
          : despacho
      )),
      entregar: (id, recibidoPor, evidenciaUrl) => actualizarDespacho(id, (despacho) => (
        !datos.jornadaCerrada && despacho.estado === 'EN_CAMINO'
          ? { ...despacho, estado: 'ENTREGADO', recibidoPor: recibidoPor.trim() || null, evidenciaUrl }
          : despacho
      )),
      fallar: (id, motivo, comentario, evidenciaUrl) => actualizarDespacho(id, (despacho) => (
        !datos.jornadaCerrada && despacho.estado === 'EN_CAMINO'
          ? {
            ...despacho,
            estado: 'FALLIDO',
            intentos: despacho.intentos + 1,
            motivo,
            comentario: comentario.trim() || null,
            evidenciaUrl,
          }
          : despacho
      )),
      cerrarJornada: () => {
        const pendientes = datos.despachos
          .filter((despacho) => despacho.estado === 'ASIGNADO' || despacho.estado === 'EN_CAMINO')
          .map((despacho) => despacho.codigo);
        setDatos((actual) => ({
          ...actual,
          jornadaCerrada: true,
          despachos: actual.despachos.map((despacho) => (
            despacho.estado === 'ASIGNADO' || despacho.estado === 'EN_CAMINO'
              ? { ...despacho, estado: 'FALLIDO', motivo: 'NO_INTENTADO' }
              : despacho
          )),
        }));
        return pendientes;
      },
    };
  }, [datos]);

  return <ContextoPrueba.Provider value={valor}>{children}</ContextoPrueba.Provider>;
}

function usePrueba(): AlmacenPrueba {
  const valor = useContext(ContextoPrueba);
  if (!valor) throw new Error('La experiencia de prueba F-03 necesita su proveedor de datos.');
  return valor;
}

function esMotivoCampo(valor: string): valor is MotivoCampo {
  return motivosSeleccionables.some((motivo) => motivo.value === valor);
}

function AccesoPrueba({ alIngresar }: { alIngresar: () => void }) {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState(false);
  const ingresar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (usuario.trim().toLowerCase() !== usuarioPrueba || clave !== clavePrueba) {
      setError(true);
      return;
    }
    sessionStorage.setItem('despacho.repartidor.prueba.autenticado', 'true');
    alIngresar();
  };

  return (
    <Stack mih="100dvh" justify="center" maw={440} mx="auto" p="lg" gap="xl">
      <Stack gap="xs" ta="center">
        <Image src={logoInkaAthletics} alt="ATHLETICS" w={320} h={125} fit="cover" mx="auto" />
        <Title order={1}>Acceso de repartidor</Title>
        <Text c="dimmed">Ingresa para consultar tu jornada y los despachos asignados.</Text>
      </Stack>
      <Card withBorder padding="lg" radius="lg">
        <form onSubmit={ingresar}>
          <Stack gap="md">
            <TextInput label="Usuario" autoComplete="username" value={usuario} onChange={(evento) => setUsuario(evento.currentTarget.value)} required />
            <PasswordInput label="Contraseña" autoComplete="current-password" value={clave} onChange={(evento) => setClave(evento.currentTarget.value)} required />
            {error && <Alert color="red" role="alert">Usuario o contraseña incorrectos.</Alert>}
            <Button type="submit" size="md" fullWidth>Ingresar</Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}

const destinos: DestinoRepartidor[] = [
  { id: 'ruta', ruta: '/repartidor/ruta', titulo: 'Mi ruta', icono: <IconRoute size={20} aria-hidden="true" /> },
  { id: 'resumen', ruta: '/repartidor/resumen', titulo: 'Resumen', icono: <IconClipboardList size={20} aria-hidden="true" /> },
  { id: 'cierre', ruta: '/repartidor/cierre', titulo: 'Cerrar jornada', icono: <IconDoorExit size={20} aria-hidden="true" /> },
];

function AplicacionAutenticada({ alCerrarSesion }: { alCerrarSesion: () => void }) {
  const navegar = useNavigate();
  const ubicacion = useLocation().pathname;
  const { datos } = usePrueba();
  const esDetalle = ubicacion.startsWith('/repartidor/despachos/');
  const esAccion = /\/(entrega|fallo|evidencia)$/.test(ubicacion);
  const seccion = destinos.find(({ ruta }) => ruta === ubicacion);
  const titulo = ubicacion.endsWith('/resumen') ? 'Resumen'
    : ubicacion.endsWith('/cierre') ? 'Cerrar jornada'
      : ubicacion.endsWith('/entrega') ? 'Confirmar entrega'
        : ubicacion.endsWith('/fallo') ? 'Registrar incidencia'
          : ubicacion.endsWith('/evidencia') ? 'Evidencia fotográfica'
            : esDetalle ? 'Detalle del despacho' : seccion?.titulo ?? 'Mi ruta';

  return (
    <ShellRepartidor
      titulo={titulo}
      estadoOperativo={datos.jornadaCerrada ? 'FUERA_DE_TURNO' : 'EN_RUTA'}
      destinos={destinos}
      destinoActivo={seccion?.id ?? null}
      modoPie={esDetalle || esAccion ? 'ninguno' : 'navegacion'}
      accionEncabezado={<Button size="xs" variant="subtle" color="white" onClick={alCerrarSesion}>Salir</Button>}
      alNavegar={(destino) => navegar(destino.ruta)}
      alVolver={esDetalle || esAccion ? () => navegar('/repartidor/ruta') : undefined}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/repartidor/ruta" replace />} />
        <Route path="/repartidor/ruta" element={<PaginaRuta />} />
        <Route path="/repartidor/resumen" element={<PaginaResumen />} />
        <Route path="/repartidor/cierre" element={<PaginaCierre />} />
        <Route path="/repartidor/despachos/:id" element={<PaginaDetalle />} />
        <Route path="/repartidor/despachos/:id/entrega" element={<FormularioResultado tipo="entrega" />} />
        <Route path="/repartidor/despachos/:id/fallo" element={<FormularioResultado tipo="fallo" />} />
        <Route path="/repartidor/despachos/:id/evidencia" element={<PaginaEvidencia />} />
        <Route path="*" element={<Navigate to="/repartidor/ruta" replace />} />
      </Routes>
    </ShellRepartidor>
  );
}

function PaginaRuta() {
  const { datos } = usePrueba();
  const navegar = useNavigate();
  const despachos = [...datos.despachos].sort((a, b) => a.secuencia - b.secuencia);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs"><Text c="dimmed">Jornada del {fecha}</Text>
          <BadgeEstado contexto="operacionRepartidor" valor={datos.jornadaCerrada ? 'FUERA_DE_TURNO' : 'EN_RUTA'} size="sm" /></Group>
        <Text size="sm" fw={600}>{datos.operador}</Text>
      </Group>
      {datos.jornadaCerrada && <Alert color="yellow" title="Jornada cerrada">Tu jornada finalizó. Puedes consultar la ruta y el resumen.</Alert>}
      {despachos.length === 0
        ? <Alert color="blue" title="Ruta vacía">No tienes despachos asignados para hoy.</Alert>
        : despachos.map((despacho) => (
          <TarjetaDespacho
            key={despacho.id}
            idDespacho={despacho.id}
            codigo={despacho.codigo}
            posicion={despacho.secuencia}
            direccion={despacho.estado === 'ASIGNADO' || despacho.estado === 'EN_CAMINO'
              ? `${despacho.direccion}, ${despacho.distrito}` : 'Dirección protegida'}
            destinatario={despacho.estado === 'ASIGNADO' || despacho.estado === 'EN_CAMINO'
              ? despacho.destinatario : etiquetaEstado(despacho)}
            estado={despacho.estado}
            complementoEstado={despacho.estado === 'FALLIDO' ? 'No entregado, regresa al centro de despacho' : undefined}
            etiquetaIntento={`${despacho.intentos} de ${despacho.maximoIntentos} intentos`}
            variante={despacho.estado === 'ENTREGADO' || despacho.motivo === 'NO_INTENTADO' ? 'resuelto' : undefined}
            alAbrir={(id) => navegar(`/repartidor/despachos/${id}`)}
          />
        ))}
    </Stack>
  );
}

function etiquetaEstado(despacho: DespachoPrueba) {
  if (despacho.motivo === 'NO_INTENTADO') return 'No intentado · devolver al centro';
  if (despacho.estado === 'FALLIDO') return 'No entregado · devolver al centro';
  return despacho.estado;
}

function PaginaDetalle() {
  const { id = '' } = useParams();
  const { datos, despacho, iniciarTraslado } = usePrueba();
  const navegar = useNavigate();
  const actual = despacho(id);
  if (!actual) return <Alert color="red" title="Despacho no encontrado">No existe el despacho solicitado.</Alert>;
  const datosPersonalesVisibles = actual.estado === 'ASIGNADO' || actual.estado === 'EN_CAMINO';
  const motivo = actual.motivo && actual.motivo !== 'NO_INTENTADO' ? etiquetaMotivo[actual.motivo] : null;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>{actual.codigo}</Title>
        <BadgeEstado contexto="despacho" valor={actual.estado}
          complemento={actual.estado === 'FALLIDO' ? 'No entregado, regresa al centro de despacho' : undefined} />
      </Group>
      <Card withBorder>
        <Stack gap="xs">
          <Text size="sm" c="dimmed">Posición {actual.secuencia} · Programado para {actual.fechaProgramada}</Text>
          {datosPersonalesVisibles ? (
            <>
              <Text fw={600}>Destinatario</Text>
              <Text>{actual.destinatario}</Text>
              <Text component="a" href={`tel:${encodeURIComponent(actual.telefono)}`}>{actual.telefono}</Text>
              <Text fw={600} mt="sm">Dirección</Text>
              <Text>{actual.direccion}</Text>
              <Text>Referencia: {actual.referencia}</Text>
              <Text>{actual.distrito}</Text>
            </>
          ) : <Text c="dimmed">Los datos personales no están disponibles para este estado.</Text>}
          <Text size="sm" c="dimmed">Intento {actual.intentos} de {actual.maximoIntentos}</Text>
          {motivo && <Text>Motivo: {motivo}</Text>}
          {actual.recibidoPor && <Text>Recibido por: {actual.recibidoPor}</Text>}
          {actual.comentario && <Text>Comentario: {actual.comentario}</Text>}
        </Stack>
      </Card>
      {!datos.jornadaCerrada && actual.estado === 'ASIGNADO' && (
        <Button size="md" onClick={() => iniciarTraslado(actual.id)}>En camino</Button>
      )}
      {!datos.jornadaCerrada && actual.estado === 'EN_CAMINO' && (
        <Stack>
          <Button size="md" onClick={() => navegar(`/repartidor/despachos/${actual.id}/entrega`)}>Confirmar entrega</Button>
          <Button size="md" variant="light" color="red" onClick={() => navegar(`/repartidor/despachos/${actual.id}/fallo`)}>Marcar como fallido</Button>
        </Stack>
      )}
      {(actual.estado === 'ENTREGADO' || actual.estado === 'FALLIDO') && actual.evidenciaUrl && (
        <Button variant="light" onClick={() => navegar(`/repartidor/despachos/${actual.id}/evidencia`)}>Ver evidencia fotográfica</Button>
      )}
      {actual.estado === 'FALLIDO' && <Alert color="yellow">Devuelve el paquete al centro de despacho.</Alert>}
      {actual.estado === 'ENTREGADO' && <Alert color="green">Entrega registrada.</Alert>}
    </Stack>
  );
}

const etiquetaMotivo: Record<MotivoFallo, string> = {
  CLIENTE_AUSENTE: 'Cliente ausente',
  DIRECCION_NO_UBICADA: 'Dirección no ubicada',
  RECHAZO_DEL_PAQUETE: 'Rechazo del paquete',
  DATOS_DE_CONTACTO_ERRONEOS: 'Datos de contacto erróneos',
  ZONA_INACCESIBLE: 'Zona inaccesible',
  PAQUETE_DANADO: 'Paquete dañado',
  NO_INTENTADO: 'No intentado',
};

const motivosSeleccionables: { value: MotivoFallo; label: string }[] = [
  { value: 'CLIENTE_AUSENTE', label: etiquetaMotivo.CLIENTE_AUSENTE },
  { value: 'DIRECCION_NO_UBICADA', label: etiquetaMotivo.DIRECCION_NO_UBICADA },
  { value: 'RECHAZO_DEL_PAQUETE', label: etiquetaMotivo.RECHAZO_DEL_PAQUETE },
  { value: 'DATOS_DE_CONTACTO_ERRONEOS', label: etiquetaMotivo.DATOS_DE_CONTACTO_ERRONEOS },
  { value: 'ZONA_INACCESIBLE', label: etiquetaMotivo.ZONA_INACCESIBLE },
  { value: 'PAQUETE_DANADO', label: etiquetaMotivo.PAQUETE_DANADO },
];

function FormularioResultado({ tipo }: { tipo: 'entrega' | 'fallo' }) {
  const { id = '' } = useParams();
  const { despacho, entregar, fallar } = usePrueba();
  const navegar = useNavigate();
  const actual = despacho(id);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fase, setFase] = useState<FaseCapturaEvidencia>('vacia');
  const [errorFoto, setErrorFoto] = useState('');
  const [motivo, setMotivo] = useState<MotivoCampo | null>(null);
  const [recibidoPor, setRecibidoPor] = useState('');
  const [comentario, setComentario] = useState('');
  const [errorEnvio, setErrorEnvio] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  if (!actual) return <Alert color="red" title="Despacho no encontrado">No existe el despacho solicitado.</Alert>;
  if (actual.estado !== 'EN_CAMINO' && !confirmado) {
    return <Alert color="yellow" title="Estado actualizado">Este despacho ya no está disponible para registrar el resultado.</Alert>;
  }

  const seleccionar = (seleccion: File) => {
    setArchivo(seleccion);
    setErrorFoto('');
    const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!permitidos.includes(seleccion.type) || seleccion.size > 2_097_152) {
      setFase('error');
      setErrorFoto('Usa una fotografía JPEG, PNG o WebP de hasta 2 MiB.');
      return;
    }
    setFase('lista');
  };
  const enviar = () => {
    if (!archivo || fase === 'error') {
      setErrorFoto('La fotografía de evidencia es obligatoria.');
      return;
    }
    setFase('subiendo');
    setErrorEnvio('');
    const url = URL.createObjectURL(archivo);
    if (tipo === 'entrega') {
      entregar(actual.id, recibidoPor, url);
    } else if (motivo) {
      fallar(actual.id, motivo, comentario, url);
    } else {
      URL.revokeObjectURL(url);
      setErrorEnvio('Selecciona un motivo.');
      return;
    }
    setFase('cargada');
    setConfirmado(true);
  };

  return (
    <Stack gap="md">
      <Text fw={700}>{actual.codigo}</Text>
      {tipo === 'entrega' ? (
        <>
          {!confirmado && (
            <>
              <CapturaEvidencia
                archivo={archivo}
                descripcionFoto={`Evidencia fotográfica de ${actual.codigo}`}
                fase={fase}
                politicaArchivo={{ tiposPermitidos: ['image/jpeg', 'image/png', 'image/webp'], maximoBytes: 2_097_152 }}
                error={errorFoto}
                alSeleccionar={seleccionar}
                alVolverATomar={() => setFase('lista')}
                alReintentar={() => archivo && seleccionar(archivo)}
              />
              {!archivo && <Alert color="yellow">La fotografía de evidencia es obligatoria.</Alert>}
              <TextInput label="Nombre de quien recibe (opcional)" value={recibidoPor} onChange={(evento) => setRecibidoPor(evento.currentTarget.value)} />
            </>
          )}
        </>
      ) : (
        <>
          {!confirmado && (
            <>
              <Select
                label="Motivo de la incidencia"
                placeholder="Selecciona un motivo"
                data={motivosSeleccionables}
                value={motivo}
                onChange={(valor) => setMotivo(valor && esMotivoCampo(valor) ? valor : null)}
                error={errorEnvio && !motivo ? errorEnvio : undefined}
                required
              />
              <CapturaEvidencia
                archivo={archivo}
                descripcionFoto={`Evidencia de incidencia de ${actual.codigo}`}
                fase={fase}
                politicaArchivo={{ tiposPermitidos: ['image/jpeg', 'image/png', 'image/webp'], maximoBytes: 2_097_152 }}
                error={errorFoto}
                alSeleccionar={seleccionar}
                alVolverATomar={() => setFase('lista')}
                alReintentar={() => archivo && seleccionar(archivo)}
              />
              <Textarea label="Comentario (opcional)" value={comentario} onChange={(evento) => setComentario(evento.currentTarget.value)} autosize minRows={2} maxLength={500} />
            </>
          )}
        </>
      )}
      {errorEnvio && <Alert color="red" role="alert">{errorEnvio}</Alert>}
      {!confirmado ? (
        <Button
          size="md"
          disabled={!archivo || fase === 'error' || (tipo === 'fallo' && !motivo)}
          onClick={enviar}
        >
          {tipo === 'entrega' ? 'Confirmar entrega' : 'Confirmar incidencia'}
        </Button>
      ) : (
        <Stack>
          <Alert color={tipo === 'entrega' ? 'green' : 'yellow'} title={tipo === 'entrega' ? 'Entrega registrada.' : 'Incidencia registrada.'}>
            {tipo === 'entrega' ? 'El despacho quedó marcado como entregado.' : 'Devuelve el paquete al centro de despacho.'}
          </Alert>
          <Button onClick={() => navegar(`/repartidor/despachos/${actual.id}`)}>Volver al detalle</Button>
        </Stack>
      )}
    </Stack>
  );
}

function PaginaResumen() {
  const { datos } = usePrueba();
  const contadores = {
    asignados: datos.despachos.length,
    entregados: datos.despachos.filter(({ estado }) => estado === 'ENTREGADO').length,
    fallidosConIntento: datos.despachos.filter(({ estado, motivo }) => estado === 'FALLIDO' && motivo !== 'NO_INTENTADO').length,
    noIntentados: datos.despachos.filter(({ motivo }) => motivo === 'NO_INTENTADO').length,
    pendientes: datos.despachos.filter(({ estado }) => estado === 'ASIGNADO' || estado === 'EN_CAMINO').length,
  };
  return (
    <Stack gap="md">
      <Text c="dimmed">Resumen del {fecha}</Text>
      <SimpleGrid cols={2} spacing="md">
        <TarjetaKpi id="asignados" etiqueta="Asignados" valor={contadores.asignados} />
        <TarjetaKpi id="entregados" etiqueta="Entregados" valor={contadores.entregados} tono="success" />
        <TarjetaKpi id="fallidos" etiqueta="Fallidos con intento" valor={contadores.fallidosConIntento} tono="error" />
        <TarjetaKpi id="no-intentados" etiqueta="No intentados" valor={contadores.noIntentados} />
        <TarjetaKpi id="pendientes" etiqueta="Pendientes" valor={contadores.pendientes} tono="info" />
      </SimpleGrid>
    </Stack>
  );
}

function PaginaCierre() {
  const { datos, cerrarJornada } = usePrueba();
  const [abierto, { open, close }] = useDisclosure(false);
  const [paquetes, setPaquetes] = useState<string[] | null>(null);
  const pendientes = datos.despachos.filter(({ estado }) => estado === 'ASIGNADO' || estado === 'EN_CAMINO');
  const confirmar = () => {
    setPaquetes(cerrarJornada());
    close();
  };

  if (datos.jornadaCerrada) {
    return (
      <Stack gap="md">
        <Alert color="green" title="Jornada cerrada">Jornada cerrada. Devuelve estos paquetes al centro de despacho.</Alert>
        {paquetes && paquetes.length > 0 && (
          <Card withBorder>
            <Stack gap="xs">
              <Text fw={700}>Paquetes por devolver</Text>
              {paquetes.map((codigo) => <Text key={codigo}>{codigo}</Text>)}
            </Stack>
          </Card>
        )}
        <PaginaResumen />
      </Stack>
    );
  }
  return (
    <Stack gap="md">
      <Text>Revisa los despachos pendientes antes de cerrar tu jornada.</Text>
      <Text>{pendientes.length} despachos pendientes.</Text>
      <Button size="lg" fullWidth onClick={open}>Cerrar jornada</Button>
      <ModalConfirmacion abierto={abierto} titulo="Confirmar cierre de jornada"
        descripcion={pendientes.length > 0
          ? `${pendientes.length} despachos quedarán como no intentados.`
          : 'No tienes despachos pendientes.'}
        etiquetaConfirmar="Confirmar cierre" alConfirmar={confirmar} alCancelar={close} />
    </Stack>
  );
}

function PaginaEvidencia() {
  const { id = '' } = useParams();
  const { despacho } = usePrueba();
  const actual = despacho(id);
  if (!actual?.evidenciaUrl) return <Alert color="yellow" title="Evidencia no disponible">Este despacho no tiene una fotografía registrada.</Alert>;
  return (
    <Stack gap="md">
      <Text fw={700}>{actual.codigo}</Text>
      <Image src={actual.evidenciaUrl} alt={`Evidencia fotográfica de ${actual.codigo}`} radius="md" />
      <Text size="sm" c="dimmed">Vigencia de acceso de prueba: sesión actual.</Text>
    </Stack>
  );
}

export function AplicacionPruebaF03() {
  const [autenticado, setAutenticado] = useState(
    () => sessionStorage.getItem('despacho.repartidor.prueba.autenticado') === 'true',
  );
  if (!autenticado) {
    return (
      <Routes>
        <Route path="/acceso" element={<AccesoPrueba alIngresar={() => setAutenticado(true)} />} />
        <Route path="*" element={<Navigate to="/acceso" replace />} />
      </Routes>
    );
  }
  const cerrarSesion = () => {
    sessionStorage.removeItem('despacho.repartidor.prueba.autenticado');
    setAutenticado(false);
  };
  return (
    <ProveedorPrueba>
      <Routes>
        <Route path="/acceso" element={<Navigate to="/repartidor/ruta" replace />} />
        <Route path="*" element={<AplicacionAutenticada alCerrarSesion={cerrarSesion} />} />
      </Routes>
    </ProveedorPrueba>
  );
}
