import { useId, useLayoutEffect, useRef } from 'react';
import { Button, Text } from '@mantine/core';
import type { AccionUi } from '../tipos-ui';
import { accionesUi } from '../formularios/patrones';
import clases from './BarraAccionesFija.module.css';

export type PropiedadesBarraAccionesFija = {
  principal: AccionUi;
  secundaria?: AccionUi;
  intencionPrincipal?: 'principal' | 'destructiva';
  alAccionar: (id: string) => void;
};

/** CR-13. Colocar al final del contenido; reserva su altura real en ese contenedor. */
export function BarraAccionesFija({
  principal, secundaria, intencionPrincipal = 'principal', alAccionar,
}: PropiedadesBarraAccionesFija) {
  const identificador = useId();
  const reserva = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const espacio = reserva.current;
    const contenido = barra.current;
    if (!espacio || !contenido) return;

    function medir() {
      if (!espacio || !contenido) return;
      const { left, width } = espacio.getBoundingClientRect();
      espacio.style.setProperty('--barra-izquierda', `${left}px`);
      espacio.style.setProperty('--barra-ancho', `${width}px`);
      // Fijar primero el ancho: la altura incluye texto multilínea y zona segura.
      espacio.dataset.medida = 'true';
      espacio.style.setProperty('--barra-altura', `${contenido.getBoundingClientRect().height}px`);
    }

    medir();
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : undefined;
    observador?.observe(contenido);
    observador?.observe(espacio);
    window.addEventListener('resize', medir);
    // También conserva la alineación si el contenedor tiene scroll horizontal.
    window.addEventListener('scroll', medir, true);
    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
    };
  }, []);

  // En entornos sin ResizeObserver también se actualiza al cambiar las acciones.
  useLayoutEffect(() => {
    const altura = barra.current?.getBoundingClientRect().height;
    if (altura !== undefined) reserva.current?.style.setProperty('--barra-altura', `${altura}px`);
  });

  function accion(entrada: AccionUi, esPrincipal: boolean) {
    const motivoId = `${identificador}-${esPrincipal ? 'principal' : 'secundaria'}-motivo`;
    const bloqueada = Boolean(entrada.disabled || entrada.loading);
    return <div className={clases.accion}>
      <Button
        {...(esPrincipal ? accionesUi[intencionPrincipal] : accionesUi.secundaria)}
        type="button"
        className={clases.boton}
        disabled={entrada.disabled}
        loading={entrada.loading}
        aria-busy={entrada.loading || undefined}
        aria-describedby={entrada.motivoDeshabilitado ? motivoId : undefined}
        onClick={() => { if (!bloqueada) alAccionar(entrada.id); }}
      >{entrada.etiqueta}</Button>
      {entrada.motivoDeshabilitado && <Text id={motivoId} size="sm" className={clases.motivo}>{entrada.motivoDeshabilitado}</Text>}
    </div>;
  }

  return <div ref={reserva} className={clases.reserva}>
    <section ref={barra} aria-label="Acciones de la página" className={clases.barra}>
      {secundaria && accion(secundaria, false)}
      {accion(principal, true)}
    </section>
  </div>;
}
