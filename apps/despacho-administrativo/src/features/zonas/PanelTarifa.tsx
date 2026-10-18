import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Drawer,
  Fieldset,
  Group,
  Skeleton,
  NumberInput,
  Stack,
  Text,
} from '@mantine/core';
import { EstadoVista, notificarOperacion } from '@despacho/componentes-compartidos';
import { IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons-react';
import { useClienteApi } from '../../cliente/useClienteApi';
import { detalleProblema, guardarTarifa, obtenerTarifaVigente, obtenerZona, problemaDe } from './api/zonasApi';
import { BadgeEstadoZona } from './BadgeEstadoZona';
import type { SolicitudTarifa, Zona } from './tipos';

type ValorCampo = number | string;

type Campos = {
  tarifaBase: ValorCampo;
  pesoIncluidoKg: ValorCampo;
  recargoKgAdicional: ValorCampo;
  factorVolumetrico: ValorCampo;
  plazoEstimadoDiasHabiles: ValorCampo;
};

const CAMPOS_VACIOS: Campos = {
  tarifaBase: '',
  pesoIncluidoKg: '',
  recargoKgAdicional: '',
  factorVolumetrico: '',
  plazoEstimadoDiasHabiles: '',
};

const MONEDA = 'PEN';

function aNumero(valor: ValorCampo): number | null {
  if (valor === '' || valor === null || valor === undefined) return null;
  const numero = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function PanelTarifa() {
  const cliente = useClienteApi();
  const navegar = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [parametros] = useSearchParams();

  const [zona, setZona] = useState<Zona | null>(null);
  const [tieneTarifa, setTieneTarifa] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [denegado, setDenegado] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [campos, setCampos] = useState<Campos>(CAMPOS_VACIOS);
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!id) return;
    let activo = true;
    setCargando(true);
    setErrorCarga(null);
    setDenegado(false);
    setZona(null);
    setTieneTarifa(false);
    setCampos(CAMPOS_VACIOS);
    Promise.all([obtenerZona(cliente, id), obtenerTarifaVigente(cliente, id)])
      .then(([zonaCargada, tarifa]) => {
        if (!activo) return;
        setZona(zonaCargada);
        if (tarifa) {
          setTieneTarifa(true);
          setCampos({
            tarifaBase: tarifa.tarifaBase,
            pesoIncluidoKg: tarifa.pesoIncluidoKg,
            recargoKgAdicional: tarifa.recargoKgAdicional,
            factorVolumetrico: tarifa.factorVolumetrico ?? '',
            plazoEstimadoDiasHabiles: tarifa.plazoEstimadoDiasHabiles,
          });
        }
      })
      .catch((error) => {
        if (!activo) return;
        const problema = problemaDe(error);
        if (problema?.status === 401 || problema?.status === 403) {
          setDenegado(true);
          setZona(null);
          return;
        }
        setErrorCarga(problema?.status === 404 ? 'La zona solicitada no existe.' : 'No se pudo cargar la tarifa. Revisa tu conexión e inténtalo de nuevo.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [cliente, id, revision]);

  const cerrar = () => { if (!guardando) navegar(`/zonas${parametros.size ? `?${parametros}` : ''}`); };
  const inactiva = zona?.estado === 'INACTIVO';

  const actualizar = (campo: keyof Campos) => (valor: ValorCampo) =>
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));

  const validar = (): Record<string, string> => {
    const errores: Record<string, string> = {};
    const base = aNumero(campos.tarifaBase);
    const peso = aNumero(campos.pesoIncluidoKg);
    const recargo = aNumero(campos.recargoKgAdicional);
    const factor = aNumero(campos.factorVolumetrico);
    const plazo = aNumero(campos.plazoEstimadoDiasHabiles);

    if (base === null || base < 0) errores.tarifaBase = 'La tarifa base no puede ser negativa';
    if (peso === null || peso <= 0) errores.pesoIncluidoKg = 'El peso incluido debe ser mayor que cero';
    if (recargo === null || recargo < 0) errores.recargoKgAdicional = 'El recargo no puede ser negativo';
    if (factor !== null && factor <= 0) errores.factorVolumetrico = 'El factor debe ser mayor que cero';
    if (plazo === null || plazo < 0) errores.plazoEstimadoDiasHabiles = 'Informa un plazo en días hábiles';
    else if (!Number.isInteger(plazo)) errores.plazoEstimadoDiasHabiles = 'El plazo debe ser un entero';
    return errores;
  };

  const guardar = async () => {
    if (!zona || inactiva || guardando) return;
    const errores = validar();
    setErroresCampos(errores);
    setErrorGeneral(null);
    if (Object.keys(errores).length > 0) return;

    const solicitud: SolicitudTarifa = {
      tarifaBase: aNumero(campos.tarifaBase) as number,
      pesoIncluidoKg: aNumero(campos.pesoIncluidoKg) as number,
      recargoKgAdicional: aNumero(campos.recargoKgAdicional) as number,
      factorVolumetrico: aNumero(campos.factorVolumetrico),
      moneda: MONEDA,
      plazoEstimadoDiasHabiles: aNumero(campos.plazoEstimadoDiasHabiles) as number,
    };

    setGuardando(true);
    try {
      await guardarTarifa(cliente, zona.id, solicitud);
      notificarOperacion({
        id: `tarifa-guardada-${zona.id}`,
        tipo: 'exito',
        mensaje: `Tarifa vigente de «${zona.nombre}» actualizada.`,
      });
      navegar(`/zonas${parametros.size ? `?${parametros}` : ''}`);
    } catch (error) {
      const problema = problemaDe(error);
      if (problema?.status === 401 || problema?.status === 403) {
        setDenegado(true);
        setZona(null);
        return;
      }
      if (problema?.status === 400 || problema?.status === 404) {
        const erroresServidor: Record<string, string> = {};
        problema.errores?.forEach(({ campo, motivo }) => {
          erroresServidor[campo] = motivo;
        });
        setErroresCampos(erroresServidor);
        setErrorGeneral(detalleProblema(error, 'La tarifa contiene campos inválidos.'));
        return;
      }
      setErrorGeneral('No se pudo guardar la tarifa. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Drawer
      opened
      onClose={cerrar}
      position="right"
      size={560}
      closeOnEscape={!guardando}
      closeOnClickOutside={!guardando}
      withCloseButton={!guardando}
      title={`Tarifas de ${zona?.nombre ?? ''}`}
      closeButtonProps={{ 'aria-label': 'Cerrar tarifas' }}
    >
      <EstadoVista estado={denegado ? 'sinPermiso' : cargando ? 'carga' : errorCarga ? 'error' : 'datos'}
        esqueleto={<Stack aria-label="Cargando tarifa">{[0, 1, 2].map((indice) => <Skeleton key={indice} height={64} />)}</Stack>}
        descripcion={denegado ? undefined : errorCarga ?? undefined}
        accion={errorCarga && !denegado ? { id: 'reintentar', etiqueta: 'Reintentar tarifa' } : undefined}
        alAccionar={() => setRevision((valor) => valor + 1)}>
        <Stack gap="md">
          {zona && <BadgeEstadoZona estado={zona.estado} />}
          {inactiva ? (
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
              Activa la zona para configurar su tarifa.
            </Alert>
          ) : null}

          {!tieneTarifa ? (
            <Text size="sm" c="dimmed">
              Esta zona aún no tiene tarifa.
            </Text>
          ) : (
            <Alert color="yellow" variant="light" title="Sustitución de tarifa">
              Al guardar, esta tarifa sustituye a la vigente y la anterior se conserva como histórico.
            </Alert>
          )}

          {errorGeneral ? (
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
              {errorGeneral}
            </Alert>
          ) : null}

          <Fieldset variant="unstyled" disabled={guardando || inactiva}><Stack gap="md">
          <NumberInput
            label="Tarifa base"
            prefix={`${MONEDA} `}
            min={0}
            decimalScale={2}
            allowNegative={false}
            withAsterisk
            value={campos.tarifaBase}
            onChange={actualizar('tarifaBase')}
            error={erroresCampos.tarifaBase}
          />
          <NumberInput
            label="Peso incluido hasta (kg)"
            suffix=" kg"
            min={0}
            decimalScale={2}
            allowNegative={false}
            withAsterisk
            value={campos.pesoIncluidoKg}
            onChange={actualizar('pesoIncluidoKg')}
            error={erroresCampos.pesoIncluidoKg}
          />
          <NumberInput
            label="Recargo por kg adicional"
            prefix={`${MONEDA} `}
            min={0}
            decimalScale={2}
            allowNegative={false}
            withAsterisk
            value={campos.recargoKgAdicional}
            onChange={actualizar('recargoKgAdicional')}
            error={erroresCampos.recargoKgAdicional}
          />
          <NumberInput
            label="Factor volumétrico"
            description="Kilogramos equivalentes por cada metro cúbico."
            min={0}
            decimalScale={3}
            allowNegative={false}
            value={campos.factorVolumetrico}
            onChange={actualizar('factorVolumetrico')}
            error={erroresCampos.factorVolumetrico}
          />
          <NumberInput
            label="Plazo estimado de entrega (días hábiles)"
            min={0}
            decimalScale={0}
            allowNegative={false}
            withAsterisk
            value={campos.plazoEstimadoDiasHabiles}
            onChange={actualizar('plazoEstimadoDiasHabiles')}
            error={erroresCampos.plazoEstimadoDiasHabiles}
          />

          <Text size="sm" c="dimmed">
            Moneda fija: {MONEDA}. Las tarifas se expresan en soles.
          </Text>
          </Stack></Fieldset>

          <Alert variant="light" color="gray" title="Cómo se calcula">
            Peso cotizable = peso total + (volumen total × factor volumétrico). Costo = tarifa base +
            recargo por kg × máximo(0, peso cotizable − peso incluido).
          </Alert>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={cerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={18} />}
              loading={guardando}
              disabled={inactiva || aNumero(campos.tarifaBase) === null || aNumero(campos.pesoIncluidoKg) === null}
              onClick={() => void guardar()}
            >
              Guardar tarifa
            </Button>
          </Group>
          {(aNumero(campos.tarifaBase) === null || aNumero(campos.pesoIncluidoKg) === null) && <Text size="sm" c="dimmed">Completa la tarifa base y el peso incluido para guardar.</Text>}
        </Stack>
      </EstadoVista>
    </Drawer>
  );
}
