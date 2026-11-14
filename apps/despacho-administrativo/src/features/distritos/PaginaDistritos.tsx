import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Button, Card, Group, Skeleton, Stack, Title } from '@mantine/core';
import {
  EncabezadoPagina,
  EstadoVista,
  ModalConfirmacion,
  notificarOperacion,
} from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { detalleProblema, problemaDe } from '../zonas/api/zonasApi';
import {
  cambiarEstadoDistrito,
  consultarDistritos,
  guardarDistrito,
  obtenerDistrito,
} from './distritosApi';
import { FormularioDistrito } from './FormularioDistrito';
import { ListadoDistritos } from './ListadoDistritos';
import { DISTRITO_INICIAL, esquemaDistrito } from './validacionDistrito';
import type { DatosDistrito, DistritoAdministrable, EstadoDistrito } from './tipos';
import clases from './Distritos.module.css';

type AccionPendiente =
  | { tipo: 'seleccionar'; id: string }
  | { tipo: 'limpiar' | 'volver' | 'revisar' }
  | { tipo: 'estado'; distrito: DistritoAdministrable };

export function PaginaDistritos() {
  const cliente = useClienteApi();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const { id } = useParams<{ id: string }>();
  const [parametros, setParametros] = useSearchParams();
  const nombre = parametros.get('nombre') ?? '';
  const estadoLeido = parametros.get('estado');
  const estado: EstadoDistrito | 'TODOS' =
    estadoLeido === 'INACTIVO' || estadoLeido === 'TODOS' ? estadoLeido : 'ACTIVO';
  const origenZonas = parametros.get('origenZonas');
  const formulario = useForm<DatosDistrito>({
    resolver: zodResolver(esquemaDistrito),
    defaultValues: DISTRITO_INICIAL,
  });
  const {
    reset,
    setError,
    formState: { isDirty },
  } = formulario;
  const [filas, setFilas] = useState<DistritoAdministrable[]>([]);
  const [consulta, setConsulta] = useState<'carga' | 'datos' | 'error'>('carga');
  const [revision, setRevision] = useState(0);
  const [original, setOriginal] = useState<DistritoAdministrable | null>(null);
  const [detalle, setDetalle] = useState<'carga' | 'datos' | 'error'>(id ? 'carga' : 'datos');
  const [revisionDetalle, setRevisionDetalle] = useState(0);
  const [error, setErrorGeneral] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [descarte, setDescarte] = useState<AccionPendiente | null>(null);
  const [confirmacion, setConfirmacion] = useState<DistritoAdministrable | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<'guardar' | 'estado' | null>(null);
  const [preparandoEstado, setPreparandoEstado] = useState(false);
  const enviando = useRef(false);
  const denegado = useRef(false);
  const vigente = useRef(true);
  const peticionLista = useRef<AbortController | null>(null);
  const peticionDetalle = useRef<AbortController | null>(null);
  const peticionEstado = useRef<AbortController | null>(null);
  const origenConfirmacion = useRef<HTMLElement | null>(null);
  const restaurarFoco = useRef(false);
  const tituloFormulario = useRef<HTMLHeadingElement>(null);
  const enfocar = () => {
    tituloFormulario.current?.scrollIntoView({ block: 'start' });
    tituloFormulario.current?.focus({ preventScroll: true });
  };
  const bloqueado = Boolean(procesando || preparandoEstado);

  const denegar = useCallback(() => {
    denegado.current = true;
    peticionLista.current?.abort();
    peticionDetalle.current?.abort();
    peticionEstado.current?.abort();
    setSinPermiso(true);
    setFilas([]);
    setOriginal(null);
    reset(DISTRITO_INICIAL);
    setConfirmacion(null);
    setDescarte(null);
    setErrorGeneral(null);
    setAviso(null);
    setExito(null);
  }, [reset]);

  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
      peticionEstado.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (sinPermiso) return;
    const controlador = new AbortController();
    peticionLista.current = controlador;
    setConsulta('carga');
    setFilas([]);
    consultarDistritos(cliente, nombre, estado, controlador.signal)
      .then((datos) => {
        if (controlador.signal.aborted || denegado.current) return;
        setFilas(datos);
        setConsulta('datos');
      })
      .catch((fallo) => {
        if (controlador.signal.aborted || denegado.current) return;
        const status = problemaDe(fallo)?.status;
        if (status === 401 || status === 403) denegar();
        else setConsulta('error');
      });
    return () => controlador.abort();
  }, [cliente, nombre, estado, revision, sinPermiso, denegar]);

  useEffect(() => {
    if (sinPermiso) return;
    const controlador = new AbortController();
    peticionDetalle.current = controlador;
    setOriginal(null);
    setErrorGeneral(null);
    setConflicto(false);
    reset(DISTRITO_INICIAL);
    if (!id) {
      setDetalle('datos');
      return;
    }
    setDetalle('carga');
    obtenerDistrito(cliente, id, controlador.signal)
      .then((datos) => {
        if (controlador.signal.aborted || denegado.current) return;
        setOriginal(datos);
        reset({
          nombre: datos.nombre,
          provincia: datos.provincia,
          departamento: datos.departamento,
          ubigeo: datos.ubigeo,
        });
        setDetalle('datos');
      })
      .catch((fallo) => {
        if (controlador.signal.aborted || denegado.current) return;
        const status = problemaDe(fallo)?.status;
        if (status === 401 || status === 403) denegar();
        else {
          setDetalle('error');
          setErrorGeneral(
            status === 404
              ? 'El distrito solicitado no existe.'
              : 'No se pudo cargar el distrito. Inténtalo de nuevo.',
          );
        }
      });
    return () => controlador.abort();
  }, [cliente, id, revisionDetalle, reset, sinPermiso, denegar]);

  useEffect(() => {
    if (id && detalle === 'datos' && original?.id === id) enfocar();
  }, [id, detalle, original]);
  useEffect(() => {
    if (!confirmacion && restaurarFoco.current) {
      restaurarFoco.current = false;
      origenConfirmacion.current?.focus({ preventScroll: true });
    }
  }, [confirmacion]);
  useEffect(() => {
    if (!isDirty && !procesando) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [isDirty, procesando]);

  const actualizar = () => setRevision((valor) => valor + 1);
  const volverAlAlta = () => {
    setOriginal(null);
    reset(DISTRITO_INICIAL);
    setErrorGeneral(null);
    setConflicto(false);
    setDetalle('datos');
    if (ubicacion.pathname !== '/distritos')
      navegar(`/distritos${ubicacion.search}`, { replace: true });
  };
  const prepararEstado = async (distrito: DistritoAdministrable) => {
    const controlador = new AbortController();
    peticionEstado.current?.abort();
    peticionEstado.current = controlador;
    setPreparandoEstado(true);
    setErrorModal(null);
    try {
      const actual = await obtenerDistrito(cliente, distrito.id, controlador.signal);
      if (controlador.signal.aborted || denegado.current) return;
      setConfirmacion(actual);
    } catch (fallo) {
      if (controlador.signal.aborted || denegado.current) return;
      const status = problemaDe(fallo)?.status;
      if (status === 401 || status === 403) denegar();
      else
        setAviso(
          detalleProblema(
            fallo,
            'No se pudo consultar el estado actual del distrito. Inténtalo de nuevo.',
          ),
        );
    } finally {
      if (!controlador.signal.aborted) setPreparandoEstado(false);
    }
  };
  const ejecutar = (accion: AccionPendiente) => {
    if (accion.tipo === 'seleccionar') {
      if (id === accion.id) setRevisionDetalle((valor) => valor + 1);
      else navegar(`/distritos/${encodeURIComponent(accion.id)}/editar${ubicacion.search}`);
    } else if (accion.tipo === 'limpiar') {
      volverAlAlta();
      enfocar();
    } else if (accion.tipo === 'volver') navegar(`/zonas${origenZonas ? `?${origenZonas}` : ''}`);
    else if (accion.tipo === 'revisar') setRevisionDetalle((valor) => valor + 1);
    else if (accion.tipo === 'estado') void prepararEstado(accion.distrito);
  };
  const solicitar = (accion: AccionPendiente) => {
    if (enviando.current || preparandoEstado) return;
    if (accion.tipo === 'estado')
      origenConfirmacion.current = document.activeElement as HTMLElement;
    if (
      (isDirty && (accion.tipo !== 'estado' || accion.distrito.id === id)) ||
      accion.tipo === 'revisar'
    )
      setDescarte(accion);
    else ejecutar(accion);
  };
  const guardar = formulario.handleSubmit(async (datos) => {
    if (
      enviando.current ||
      preparandoEstado ||
      conflicto ||
      denegado.current ||
      (id && original?.id !== id)
    )
      return;
    enviando.current = true;
    setProcesando('guardar');
    setErrorGeneral(null);
    try {
      const guardado = await guardarDistrito(cliente, datos, original);
      if (!vigente.current || denegado.current) return;
      const mensaje = `Distrito «${guardado.nombre}» ${original ? 'actualizado' : 'registrado'} correctamente.`;
      notificarOperacion({ id: `distrito-guardado-${guardado.id}`, tipo: 'exito', mensaje });
      setExito(mensaje);
      setAviso(
        (estado !== 'TODOS' && guardado.estado !== estado) ||
          !guardado.nombre.toLocaleLowerCase().includes(nombre.trim().toLocaleLowerCase())
          ? 'El distrito guardado no coincide con los filtros actuales y puede no aparecer en el listado.'
          : null,
      );
      volverAlAlta();
      actualizar();
      enfocar();
    } catch (fallo) {
      if (!vigente.current || denegado.current) return;
      const problema = problemaDe(fallo);
      if (problema?.status === 401 || problema?.status === 403) {
        denegar();
        return;
      }
      problema?.errores?.forEach(({ campo, motivo }) => {
        if (
          campo === 'nombre' ||
          campo === 'provincia' ||
          campo === 'departamento' ||
          campo === 'ubigeo'
        )
          setError(campo, { type: 'servidor', message: motivo }, { shouldFocus: true });
      });
      setConflicto(
        problema?.code === 'DESP_ERROR_DISTRITO_DESACTUALIZADO' ||
          problema?.code === 'DESP_ERROR_IDENTIDAD_DISTRITO_PROTEGIDA',
      );
      setErrorGeneral(
        detalleProblema(fallo, 'No se pudo guardar el distrito. Tus datos se conservan.'),
      );
    } finally {
      enviando.current = false;
      if (vigente.current) setProcesando(null);
    }
  });

  const confirmarEstado = async () => {
    if (!confirmacion || enviando.current || denegado.current) return;
    enviando.current = true;
    setProcesando('estado');
    setErrorModal(null);
    try {
      const guardado = await cambiarEstadoDistrito(cliente, confirmacion);
      if (!vigente.current || denegado.current) return;
      const mensaje = `Distrito «${guardado.nombre}» ${guardado.estado === 'ACTIVO' ? 'reactivado' : 'desactivado'} correctamente.`;
      notificarOperacion({ id: `distrito-estado-${guardado.id}`, tipo: 'exito', mensaje });
      setExito(mensaje);
      setAviso(null);
      setConfirmacion(null);
      if (id === guardado.id) volverAlAlta();
      actualizar();
      enfocar();
    } catch (fallo) {
      if (!vigente.current || denegado.current) return;
      const problema = problemaDe(fallo);
      if (problema?.status === 401 || problema?.status === 403) denegar();
      else if (problema?.code === 'DESP_ERROR_DISTRITO_DESACTUALIZADO') {
        setConfirmacion(null);
        setAviso(
          'El distrito cambió. Revisa los datos actualizados y confirma de nuevo la acción.',
        );
        actualizar();
      } else
        setErrorModal(detalleProblema(fallo, 'No se pudo cambiar el estado. Inténtalo de nuevo.'));
    } finally {
      enviando.current = false;
      if (vigente.current) setProcesando(null);
    }
  };

  if (sinPermiso) return <EstadoVista estado="sinPermiso" />;
  return (
    <Stack gap="lg">
      <EncabezadoPagina
        titulo="Distritos"
        subtitulo="Administración de distritos de Lima Metropolitana y Callao"
        acciones={
          <Group>
            <Button variant="default" disabled={bloqueado} onClick={actualizar}>
              Actualizar distritos
            </Button>
            <Button
              variant="default"
              disabled={bloqueado}
              onClick={() => solicitar({ tipo: 'volver' })}
            >
              Volver a zonas
            </Button>
          </Group>
        }
      />
      {exito && (
        <Alert color="green" title="Operación confirmada" role="status">
          {exito}
        </Alert>
      )}
      {aviso && (
        <Alert title="Revisa el catálogo" role="status">
          {aviso}
        </Alert>
      )}
      <div className={clases.paneles}>
        <Card
          component="section"
          aria-labelledby="titulo-formulario-distrito"
          className={clases.panel}
          withBorder
        >
          <Stack>
            <Title
              order={2}
              id="titulo-formulario-distrito"
              ref={tituloFormulario}
              tabIndex={-1}
              className={clases.tituloFormulario}
            >
              {id ? 'Editar distrito' : 'Nuevo distrito'}
            </Title>
            {detalle === 'datos' && (!id || original?.id === id) ? (
              <FormularioDistrito
                formulario={formulario}
                original={original}
                bloqueado={bloqueado}
                guardando={procesando === 'guardar'}
                error={error}
                conflicto={conflicto}
                alGuardar={(evento) => void guardar(evento)}
                alLimpiar={() => solicitar({ tipo: 'limpiar' })}
                alRevisar={() => solicitar({ tipo: 'revisar' })}
              />
            ) : (
              <>
                <EstadoVista
                  estado={detalle === 'error' ? 'error' : 'carga'}
                  esqueleto={<Skeleton height={320} aria-label="Cargando distrito" />}
                  descripcion={error ?? undefined}
                  accion={
                    detalle === 'error'
                      ? { id: 'reintentar', etiqueta: 'Reintentar detalle' }
                      : undefined
                  }
                  alAccionar={() => setRevisionDetalle((valor) => valor + 1)}
                />
                <Button
                  variant="default"
                  disabled={bloqueado}
                  onClick={() => solicitar({ tipo: 'limpiar' })}
                >
                  Cancelar edición
                </Button>
              </>
            )}
          </Stack>
        </Card>
        <Stack
          component="section"
          aria-labelledby="titulo-listado-distritos"
          className={clases.panel}
        >
          <Title order={2} id="titulo-listado-distritos">
            Distritos registrados
          </Title>
          <ListadoDistritos
            filas={filas}
            consulta={consulta}
            nombre={nombre}
            estado={estado}
            seleccionado={id}
            bloqueado={bloqueado}
            alFiltrar={(campo, valor) =>
              setParametros(
                (actual) => {
                  const siguiente = new URLSearchParams(actual);
                  if (valor) siguiente.set(campo, valor);
                  else siguiente.delete(campo);
                  return siguiente;
                },
                { replace: true },
              )
            }
            alReintentar={actualizar}
            alLimpiarFiltros={() =>
              setParametros(origenZonas ? { origenZonas } : {}, { replace: true })
            }
            alEditar={(seleccion) => solicitar({ tipo: 'seleccionar', id: seleccion })}
            alCambiarEstado={(distrito) => solicitar({ tipo: 'estado', distrito })}
          />
        </Stack>
      </div>
      <ModalConfirmacion
        abierto={Boolean(descarte)}
        titulo={
          descarte?.tipo === 'revisar'
            ? '¿Descartar los cambios y consultar de nuevo?'
            : '¿Descartar los cambios?'
        }
        descripcion="Los valores ingresados no se guardarán."
        etiquetaConfirmar={descarte?.tipo === 'revisar' ? 'Descartar y consultar' : 'Descartar'}
        intencion="destructiva"
        alCancelar={() => setDescarte(null)}
        alConfirmar={() => {
          if (!descarte) return;
          const accion = descarte;
          setDescarte(null);
          ejecutar(accion);
        }}
      />
      <ModalConfirmacion
        abierto={Boolean(confirmacion)}
        titulo={`¿${confirmacion?.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar'} ${confirmacion?.nombre ?? ''}?`}
        descripcion={
          confirmacion?.estado === 'ACTIVO'
            ? `${confirmacion.nombre} dejará de admitir nuevas cotizaciones y solicitudes de despacho. Los despachos existentes continuarán su proceso. Sus asociaciones con zonas se conservarán.`
            : 'El distrito volverá a ofrecer su cobertura conservada si su zona está activa. No se activarán zonas ni se crearán tarifas automáticamente.'
        }
        etiquetaConfirmar={
          confirmacion?.estado === 'ACTIVO' ? 'Desactivar distrito' : 'Reactivar distrito'
        }
        intencion={confirmacion?.estado === 'ACTIVO' ? 'destructiva' : 'principal'}
        procesando={procesando === 'estado'}
        error={errorModal ?? undefined}
        alConfirmar={() => void confirmarEstado()}
        alCancelar={() => {
          if (!enviando.current) {
            restaurarFoco.current = true;
            setConfirmacion(null);
          }
        }}
      />
    </Stack>
  );
}
