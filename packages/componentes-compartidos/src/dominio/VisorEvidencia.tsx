import { useEffect, useRef, useState } from 'react';
import { Box, Button, Image, Modal, Skeleton, Stack, Text, VisuallyHidden } from '@mantine/core';
import { EstadoVista } from '../feedback/EstadoVista';
import clases from './VisorEvidencia.module.css';

export type EstadoVisorEvidencia = 'carga' | 'lista' | 'sinEvidencia' | 'expirada' | 'error' | 'sinPermiso';

type PropiedadesComunes = {
  abierto: boolean;
  /** Muestra la misma fotografía autorizada en la página mientras el modal está cerrado. */
  vistaPrevia?: boolean;
  descripcion: string;
  mensajeSinEvidencia?: string;
  alCerrar: () => void;
  alSolicitarAcceso: () => void;
  alFallarImagen: () => void;
};

export type PropiedadesVisorEvidencia = PropiedadesComunes & (
  | { estado: 'lista'; urlAutorizada: string }
  | { estado: Exclude<EstadoVisorEvidencia, 'lista'>; urlAutorizada?: string | null }
);

function ErrorEvidencia({ expirada = false, alSolicitarAcceso }: { expirada?: boolean; alSolicitarAcceso: () => void }) {
  return <EstadoVista
    compacto
    estado="error"
    titulo={expirada ? 'El enlace de la evidencia expiró' : 'No pudimos mostrar la evidencia'}
    descripcion={expirada ? 'Vuelve a cargar la foto para solicitar un nuevo acceso.' : 'Reintenta para solicitar acceso a la fotografía nuevamente.'}
    accion={{ id: 'renovar-acceso', etiqueta: expirada ? 'Volver a cargar' : 'Reintentar' }}
    alAccionar={() => alSolicitarAcceso()}
  />;
}

function EsqueletoEvidencia() {
  return <Box className={clases.marco} aria-busy="true" role="region" aria-label="Cargando fotografía de evidencia">
    <Skeleton height="100%" radius="lg" className={clases.esqueleto} aria-hidden="true" />
    <VisuallyHidden role="status">Cargando fotografía de evidencia.</VisuallyHidden>
  </Box>;
}

function ImagenAutorizada({ url, descripcion, alFallarImagen, alSolicitarAcceso }: {
  url: string;
  descripcion: string;
  alFallarImagen: () => void;
  alSolicitarAcceso: () => void;
}) {
  const [fase, cambiarFase] = useState<'carga' | 'lista' | 'error'>('carga');
  const falloNotificado = useRef(false);

  if (fase === 'error') return <ErrorEvidencia alSolicitarAcceso={alSolicitarAcceso} />;

  return <Box component="figure" m={0}>
    <Box className={clases.marco} role="region" aria-label="Fotografía de evidencia" aria-busy={fase === 'carga'}>
      {fase === 'carga' && <Skeleton height="100%" radius="lg" className={clases.esqueleto} aria-hidden="true" />}
      <Image
        src={url}
        alt={descripcion}
        fit="contain"
        referrerPolicy="no-referrer"
        className={clases.imagen}
        style={{ visibility: fase === 'lista' ? 'visible' : 'hidden' }}
        onLoad={() => cambiarFase('lista')}
        onError={() => {
          if (falloNotificado.current) return;
          falloNotificado.current = true;
          cambiarFase('error');
          alFallarImagen();
        }}
      />
    </Box>
    <Text component="figcaption" mt="sm">{descripcion}</Text>
    <VisuallyHidden role="status">{fase === 'carga' ? 'Cargando fotografía de evidencia.' : 'Fotografía de evidencia disponible.'}</VisuallyHidden>
  </Box>;
}

/** CR-18: la autorización y la correspondencia URL/despacho pertenecen al contenedor. */
export function VisorEvidencia({
  abierto, vistaPrevia = false, estado, urlAutorizada = null, descripcion,
  mensajeSinEvidencia = 'Este despacho no tiene evidencia fotográfica disponible.',
  alCerrar, alSolicitarAcceso, alFallarImagen,
}: PropiedadesVisorEvidencia) {
  const contenido = useRef<HTMLDivElement>(null);
  const cierre = useRef<HTMLButtonElement>(null);

  // Una recuperación puede desmontar el botón enfocado al cambiar a carga.
  useEffect(() => {
    if (abierto && contenido.current && !contenido.current.contains(document.activeElement)) {
      cierre.current?.focus({ preventScroll: true });
    }
  }, [abierto, estado, urlAutorizada]);

  const fotografia = estado === 'carga' ? <EsqueletoEvidencia /> :
    estado === 'lista' && urlAutorizada?.trim() ? <ImagenAutorizada key={urlAutorizada} url={urlAutorizada} descripcion={descripcion} alFallarImagen={alFallarImagen} alSolicitarAcceso={alSolicitarAcceso} /> :
    estado === 'sinEvidencia' ? <EstadoVista compacto estado="vacio" titulo="Sin evidencia fotográfica" descripcion={mensajeSinEvidencia} /> :
    estado === 'sinPermiso' ? <EstadoVista estado="sinPermiso" titulo="No tienes permisos para ver esta evidencia" descripcion="Solicita acceso a la persona responsable." /> :
    <ErrorEvidencia expirada={estado === 'expirada'} alSolicitarAcceso={alSolicitarAcceso} />;

  return <>
    {vistaPrevia && !abierto && fotografia}
    <Modal.Root
    opened={abierto}
    onClose={() => alCerrar()}
    size="xl"
    radius="lg"
    centered
    closeOnClickOutside={false}
    closeOnEscape
    trapFocus
    returnFocus
    keepMounted={false}
    transitionProps={{ duration: 150, transition: 'fade' }}
    className={clases.raiz}
    classNames={{ inner: clases.interior, content: clases.contenido, title: clases.titulo, header: clases.cabecera, body: clases.cuerpo }}
  >
    <Modal.Overlay backgroundOpacity={0.55} />
    <Modal.Content ref={contenido}>
      <Modal.Header>
        <Modal.Title>Evidencia del despacho</Modal.Title>
        <Modal.CloseButton ref={cierre} type="button" aria-label="Cerrar visor de evidencia" className={clases.cerrar} data-autofocus />
      </Modal.Header>
      <Modal.Body>
        <Stack gap="lg">
          {/* Se retira la imagen incluso durante la animación de cierre. */}
          {abierto && fotografia}
          <Button type="button" variant="outline" color="orange.8" onClick={() => alCerrar()} className={clases.volver}>Volver</Button>
        </Stack>
      </Modal.Body>
    </Modal.Content>
  </Modal.Root>
  </>;
}
