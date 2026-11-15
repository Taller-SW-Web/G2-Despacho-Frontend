import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarDistritos } from '../distritos/distritosApi';
import type { DistritoAdministrable } from '../distritos/tipos';
import { detalleProblema, problemaDe } from '../zonas/api/zonasApi';
import { importarGeometrias, validarGeometrias } from './geometriasApi';
import { MapaDiferido } from './MapaDiferido';
import type { InformeGeografico, ResultadoImportacion } from './tipos';

const MAXIMO_BYTES = 5_242_880;
export function leerGeoJson(archivo: File): Promise<unknown> {
  return new Promise((resolver, rechazar) => {
    if (archivo.size > MAXIMO_BYTES) {
      rechazar(new Error('El archivo supera 5 MiB.'));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      try {
        resolver(JSON.parse(String(lector.result)));
      } catch {
        rechazar(new Error('El archivo no contiene JSON válido.'));
      }
    };
    lector.readAsText(archivo, 'UTF-8');
  });
}

export function ImportadorGeometrias({
  alCerrar,
  alImportar,
  alDenegar,
}: {
  alCerrar: () => void;
  alImportar: () => void;
  alDenegar: () => void;
}) {
  const cliente = useClienteApi();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [geojson, setGeojson] = useState<unknown>(null);
  const [fuente, setFuente] = useState('');
  const [versionFuente, setVersionFuente] = useState('');
  const [correspondencias, setCorrespondencias] = useState<Record<number, string>>({});
  const [catalogo, setCatalogo] = useState<DistritoAdministrable[]>([]);
  const [informe, setInforme] = useState<InformeGeografico | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [procesando, setProcesando] = useState<'validar' | 'importar' | null>(null);
  const [recuperando, setRecuperando] = useState(false);
  const [vencida, setVencida] = useState(false);
  const peticion = useRef<AbortController | null>(null);
  const lectura = useRef(0);
  const clave = useRef<string | null>(null);
  const enviando = useRef(false);
  const vigente = useRef(true);
  const bloqueado = Boolean(procesando || recuperando || resultado);

  useEffect(() => {
    vigente.current = true;
    const consulta = new AbortController();
    consultarDistritos(cliente, '', 'TODOS', consulta.signal)
      .then((datos) => {
        if (!consulta.signal.aborted) setCatalogo(datos);
      })
      .catch((fallo) => {
        if (consulta.signal.aborted) return;
        if ([401, 403].includes(problemaDe(fallo)?.status ?? 0)) alDenegar();
        else setError('No se pudo cargar el catálogo para revisar correspondencias.');
      });
    return () => {
      vigente.current = false;
      lectura.current++;
      consulta.abort();
      peticion.current?.abort();
    };
  }, [cliente, alDenegar]);
  useEffect(() => {
    if (!informe?.valida || !informe.expiraEn || recuperando) return;
    const comprobar = () => setVencida(Date.now() >= Date.parse(informe.expiraEn!));
    comprobar();
    const reloj = window.setInterval(comprobar, 1000);
    return () => window.clearInterval(reloj);
  }, [informe, recuperando]);

  const invalidar = () => {
    setInforme(null);
    setResultado(null);
    setVencida(false);
    setError(null);
    clave.current = null;
  };
  const seleccionarArchivo = async (nuevo: File | null) => {
    if (bloqueado) return;
    const numero = ++lectura.current;
    setArchivo(nuevo);
    setGeojson(null);
    setCorrespondencias({});
    invalidar();
    setLeyendo(Boolean(nuevo));
    if (!nuevo) return;
    try {
      const contenido = await leerGeoJson(nuevo);
      if (vigente.current && numero === lectura.current) setGeojson(contenido);
    } catch (fallo) {
      if (vigente.current && numero === lectura.current)
        setError(fallo instanceof Error ? fallo.message : 'No se pudo leer el archivo.');
    } finally {
      if (vigente.current && numero === lectura.current) setLeyendo(false);
    }
  };
  const rechazarPermiso = (fallo: unknown) => {
    if ([401, 403].includes(problemaDe(fallo)?.status ?? 0)) {
      setGeojson(null);
      setInforme(null);
      setResultado(null);
      alDenegar();
      return true;
    }
    return false;
  };
  const validar = async () => {
    if (enviando.current || !geojson || !fuente.trim() || !versionFuente.trim()) return;
    const solicitud = {
      geojson,
      fuente: fuente.trim(),
      versionFuente: versionFuente.trim(),
      nombreArchivo: archivo?.name,
      correspondencias: Object.entries(correspondencias)
        .filter(([, codigo]) => codigo)
        .map(([indice, ubigeo]) => ({ indice: Number(indice), ubigeo })),
    };
    if (new TextEncoder().encode(JSON.stringify(solicitud)).length > MAXIMO_BYTES) {
      setError('El cuerpo de importación, incluidos sus metadatos, supera 5 MiB.');
      return;
    }
    enviando.current = true;
    setProcesando('validar');
    invalidar();
    const controlador = new AbortController();
    peticion.current = controlador;
    try {
      const datos = await validarGeometrias(cliente, solicitud, controlador.signal);
      if (!vigente.current || controlador.signal.aborted) return;
      setInforme(datos);
      clave.current = datos.valida ? crypto.randomUUID() : null;
    } catch (fallo) {
      if (vigente.current && !controlador.signal.aborted && !rechazarPermiso(fallo))
        setError(detalleProblema(fallo, 'No se pudo validar. Tus datos se conservan.'));
    } finally {
      enviando.current = false;
      if (vigente.current) setProcesando(null);
    }
  };
  const confirmar = async () => {
    if (
      enviando.current ||
      !informe?.valida ||
      !informe.validacionId ||
      !clave.current ||
      (vencida && !recuperando)
    )
      return;
    enviando.current = true;
    setProcesando('importar');
    setError(null);
    setRecuperando(true);
    const controlador = new AbortController();
    peticion.current = controlador;
    try {
      const datos = await importarGeometrias(
        cliente,
        informe.validacionId,
        clave.current,
        controlador.signal,
      );
      if (!vigente.current || controlador.signal.aborted) return;
      setResultado(datos);
      setRecuperando(false);
      alImportar();
    } catch (fallo) {
      if (!vigente.current || controlador.signal.aborted || rechazarPermiso(fallo)) return;
      const status = problemaDe(fallo)?.status;
      if (status === 409 || status === 400 || status === 404) {
        setRecuperando(false);
        setInforme(null);
        clave.current = null;
      }
      setError(
        detalleProblema(
          fallo,
          'No se recibió confirmación. Reintenta con la misma propuesta y clave para recuperar el resultado.',
        ),
      );
    } finally {
      enviando.current = false;
      if (vigente.current) setProcesando(null);
    }
  };
  const contenido = geojson as {
    features?: { properties?: { ubigeo?: unknown; nombre?: string; distrito?: string } }[];
  } | null;
  const entidades = Array.isArray(contenido?.features) ? contenido.features : [];
  return (
    <Modal
      opened
      onClose={() => {
        if (!procesando && !recuperando) alCerrar();
      }}
      title="Importar geometrías distritales"
      closeButtonProps={{ 'aria-label': 'Cerrar importador' }}
      size="90%"
      closeOnEscape={!procesando && !recuperando}
      closeOnClickOutside={!procesando && !recuperando}
      withCloseButton={!procesando && !recuperando}
    >
      <Stack>
        <Text size="sm">
          Carga un GeoJSON individual o una colección. Revisa la propuesta antes de confirmar el
          reemplazo.
        </Text>
        {error && (
          <Alert color="red" title="Revisa la importación" role="alert">
            {error}
          </Alert>
        )}
        <FileInput
          label="Archivo GeoJSON"
          accept=".geojson,.json,application/geo+json,application/json"
          value={archivo}
          onChange={(nuevo) => void seleccionarArchivo(nuevo)}
          disabled={bloqueado}
          clearable
        />
        <Group grow align="start">
          <TextInput
            label="Fuente del conjunto"
            value={fuente}
            maxLength={200}
            required
            disabled={bloqueado}
            onChange={(e) => {
              setFuente(e.currentTarget.value);
              invalidar();
            }}
          />
          <TextInput
            label="Versión o revisión de la fuente"
            value={versionFuente}
            maxLength={200}
            required
            disabled={bloqueado}
            onChange={(e) => {
              setVersionFuente(e.currentTarget.value);
              invalidar();
            }}
          />
        </Group>
        {archivo && (
          <Text size="sm">
            {archivo.name} · {(archivo.size / 1024).toFixed(1)} KiB · {entidades.length} entidad(es)
          </Text>
        )}
        {entidades.slice(0, 100).map((entidad, indice) => {
          const p = entidad?.properties;
          if (p && Object.prototype.hasOwnProperty.call(p, 'ubigeo'))
            return (
              <Text size="sm" key={indice}>
                Entidad {indice + 1}: ubigeo declarado {String(p.ubigeo)} · se comprobará con el
                catálogo.
              </Text>
            );
          const sugerencia = informe?.sugerencias.find((s) => s.indice === indice);
          return (
            <Select
              key={indice}
              label={`Distrito de la entidad ${indice + 1}`}
              description={
                sugerencia
                  ? `Sugerencia: ${sugerencia.nombre} (${sugerencia.ubigeo}). Confírmala seleccionando el distrito.`
                  : 'Sin ubigeo: selecciona explícitamente su correspondencia.'
              }
              placeholder="Selecciona el distrito del catálogo"
              searchable
              clearable
              disabled={bloqueado}
              data={catalogo.map((d) => ({ value: d.ubigeo, label: `${d.nombre} · ${d.ubigeo}` }))}
              value={correspondencias[indice] ?? null}
              onChange={(valor) => {
                setCorrespondencias((actual) => ({ ...actual, [indice]: valor ?? '' }));
                invalidar();
              }}
            />
          );
        })}
        {!resultado && (
          <Button
            onClick={() => void validar()}
            loading={procesando === 'validar' || leyendo}
            disabled={bloqueado || leyendo || !geojson || !fuente.trim() || !versionFuente.trim()}
          >
            Validar y previsualizar
          </Button>
        )}
        {informe && (
          <Stack>
            <Title order={3}>Resultado de validación</Title>
            <Group>
              <Badge color={informe.valida ? 'green' : 'red'}>
                {informe.valida ? 'Propuesta válida' : 'Hay incidencias'}
              </Badge>
              <Text>
                {informe.entidades} entidad(es) · {informe.posiciones} posiciones
              </Text>
            </Group>
            {informe.errores.length > 0 && (
              <Alert color="red" title="Incidencias del archivo">
                <ul>
                  {informe.errores.map((e, i) => (
                    <li key={i}>
                      {e.campo}: {e.motivo}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}
            <Table.ScrollContainer minWidth={400}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Distrito</Table.Th>
                    <Table.Th>Ubigeo</Table.Th>
                    <Table.Th>Operación</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {informe.distritos.map((d) => (
                    <Table.Tr key={d.id}>
                      <Table.Td>{d.nombre}</Table.Td>
                      <Table.Td>{d.ubigeo}</Table.Td>
                      <Table.Td>
                        {d.accion === 'PRIMERA_CARGA' ? 'Primera carga' : 'Reemplazo'}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {informe.propuesta.features.length > 0 && (
              <>
                <Title order={3}>Límites actuales</Title>
                <MapaDiferido capa={informe.actuales} etiqueta="Comparación: límites actuales" />
                <Title order={3}>Límites propuestos</Title>
                <MapaDiferido capa={informe.propuesta} etiqueta="Comparación: límites propuestos" />
              </>
            )}
            {vencida && !recuperando && (
              <Alert title="Validación vencida">Vuelve a validar antes de confirmar.</Alert>
            )}
            {recuperando && !procesando && (
              <Alert title="Confirmación pendiente">
                Reintenta para recuperar el resultado con la misma clave. La propuesta se conserva.
              </Alert>
            )}
            {!resultado && (
              <Button
                onClick={() => void confirmar()}
                loading={procesando === 'importar'}
                disabled={!informe.valida || Boolean(procesando) || (vencida && !recuperando)}
              >
                {recuperando ? 'Reintentar confirmación' : 'Confirmar importación'}
              </Button>
            )}
          </Stack>
        )}
        {resultado && (
          <Alert color="green" title="Importación confirmada" role="status">
            Se guardaron {resultado.distritos.length} geometría(s). Importación:{' '}
            {resultado.importacionId}.
          </Alert>
        )}
        <Button variant="default" disabled={Boolean(procesando || recuperando)} onClick={alCerrar}>
          {resultado ? 'Cerrar importación' : 'Cancelar importación'}
        </Button>
      </Stack>
    </Modal>
  );
}
