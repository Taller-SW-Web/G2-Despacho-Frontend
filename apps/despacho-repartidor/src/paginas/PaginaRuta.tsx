import { useCallback, useEffect } from 'react';
import { ActionIcon, Box, Progress, Stack, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { EstadoVista, FranjaEstado, TarjetaDespacho } from '@despacho/componentes-compartidos';
import { useNavigate } from 'react-router-dom';
import { useOperacion } from '../api/ContextoOperacion';
import { esNoIntentado, esPendiente, type DespachoRuta } from '../api/tipos';
import { CargandoTarjetas, ErrorConsulta, Pantalla } from '../componentes/Pantalla';
import { useConsulta } from '../componentes/useConsulta';
import { etiquetaIntento, formatearHora } from '../utilidades/formato';
import clases from './PaginaRuta.module.css';

/** Texto del resultado con su hora; los datos personales ya no llegan para estos estados. */
export function complementoResultado(despacho: Pick<DespachoRuta, 'estado' | 'motivoFallo' | 'hitos'>): string | undefined {
  const hitos = despacho.hitos;
  if (despacho.estado === 'ENTREGADO') {
    const hora = formatearHora(hitos?.entregadoEn);
    return hora ? `Entregado a las ${hora}` : 'Entregado';
  }
  if (esNoIntentado(despacho.estado, despacho.motivoFallo)) return 'No intentado · devuelve el paquete al centro';
  if (despacho.estado === 'FALLIDO') {
    const hora = formatearHora(hitos?.fallidoEn);
    return `No entregado${hora ? ` a las ${hora}` : ''}, regresa al centro de despacho`;
  }
  if (despacho.estado === 'EN_CAMINO') {
    const hora = formatearHora(hitos?.enCaminoEn);
    return hora ? `En camino desde las ${hora}` : undefined;
  }
  return undefined;
}

/** 02 · Mi ruta y 07 · Mi ruta tras registrar una entrega (la notificación la emite la pantalla de entrega). */
export function PaginaRuta() {
  const operacion = useOperacion();
  const navigate = useNavigate();
  const cargar = useCallback((signal: AbortSignal) => operacion.consultarRuta(signal), [operacion]);
  const { consulta, recargar } = useConsulta(cargar);

  // Al volver a la app desde el teléfono o el mapa, la ruta se actualiza sin recargar toda la vista.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') recargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [recargar]);

  const ruta = consulta.estado === 'lista' ? consulta.datos : null;
  const total = ruta?.despachos.length ?? 0;
  const resueltos = ruta?.despachos.filter((despacho) => !esPendiente(despacho.estado)).length ?? 0;
  const siguiente = ruta?.despachos.find((despacho) => esPendiente(despacho.estado));

  return (
    <Pantalla
      titulo="Mi ruta"
      seccion="ruta"
      estadoOperativo={ruta?.estadoOperativo ?? null}
      accionEncabezado={<ActionIcon variant="subtle" color="gray.0" aria-label="Actualizar ruta" onClick={recargar} size="xl">
        <IconRefresh size={22} aria-hidden="true" />
      </ActionIcon>}
      franja={ruta?.idJornada && total > 0 ? (
        <Box className={clases.progreso} role="status" aria-live="polite">
          <Text fw={700} size="md" className="ia-num">{resueltos} de {total} despachos resueltos</Text>
          <Progress value={(resueltos / total) * 100} color="orange" size="md" radius="xl" aria-hidden="true" mt="xs" />
        </Box>
      ) : undefined}
    >
      {consulta.estado === 'cargando' && <CargandoTarjetas />}
      {consulta.estado === 'error' && <ErrorConsulta error={consulta.error} alReintentar={recargar} />}
      {ruta && !ruta.idJornada && (
        <Stack gap="md">
          <FranjaEstado tipo="fueraDeTurno" mensaje="No tienes una jornada activa para hoy. Consulta tu resumen o comunícate con el Gestor." />
        </Stack>
      )}
      {ruta?.idJornada && total === 0 && (
        <EstadoVista estado="vacio" titulo="Ruta vacía" descripcion="Todavía no tienes despachos asignados a esta jornada."
          accion={{ id: 'actualizar', etiqueta: 'Actualizar' }} alAccionar={recargar} />
      )}
      {ruta?.idJornada && total > 0 && (
        <Stack gap="md" component="ol" className={clases.lista} aria-label="Despachos de la ruta">
          {ruta.despachos.map((despacho, indice) => (
            <li key={despacho.idDespacho}>
              <TarjetaDespacho
                idDespacho={despacho.idDespacho}
                codigo={despacho.codigoRastreoInterno}
                posicion={despacho.secuenciaRuta ?? indice + 1}
                direccion={despacho.direccion && despacho.distrito ? `${despacho.direccion}, ${despacho.distrito}` : despacho.direccion}
                destinatario={despacho.destinatario}
                estado={despacho.estado}
                complementoEstado={complementoResultado(despacho)}
                etiquetaIntento={etiquetaIntento(despacho.numeroIntentos, despacho.maximoIntentos, despacho.estado)}
                variante={despacho === siguiente ? 'siguiente' : esPendiente(despacho.estado) ? 'normal' : 'resuelto'}
                alAbrir={(id) => navigate(`/repartidor/despachos/${encodeURIComponent(id)}`, { state: { totalRuta: total } })}
              />
            </li>
          ))}
        </Stack>
      )}
    </Pantalla>
  );
}
