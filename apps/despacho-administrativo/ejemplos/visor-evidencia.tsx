import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Container, MantineProvider, NativeSelect, Stack, Text, Title } from '@mantine/core';
import { VisorEvidencia, tema } from '@despacho/componentes-compartidos';
import type { EstadoVisorEvidencia } from '@despacho/componentes-compartidos';
import '@mantine/core/styles.css';
import '@despacho/componentes-compartidos/tokens.css';

type Recurso = 'DEMO-A' | 'DEMO-B';
type Acceso = { estado: 'lista'; urlAutorizada: string } | { estado: Exclude<EstadoVisorEvidencia, 'lista'>; urlAutorizada?: null };
type Consulta = { recurso: Recurso; acceso: Acceso };

function EjemploVisorEvidencia() {
  const [escenario, cambiarEscenario] = useState('lista');
  const [recurso, cambiarRecurso] = useState<Recurso>('DEMO-A');
  const [consulta, cambiarConsulta] = useState<Consulta>();
  const [abierto, cambiarAbierto] = useState(false);
  const [mensaje, cambiarMensaje] = useState('Selecciona un caso y abre el visor.');
  const solicitudActual = useRef(0);
  const temporizadores = useRef(new Set<number>());

  function programar(accion: () => void, demora: number) {
    const temporizador = window.setTimeout(() => { temporizadores.current.delete(temporizador); accion(); }, demora);
    temporizadores.current.add(temporizador);
  }

  useEffect(() => () => { temporizadores.current.forEach(window.clearTimeout); }, []);

  function solicitar(destino: Recurso, resultado: string, demora = 600) {
    const solicitud = ++solicitudActual.current;
    cambiarRecurso(destino);
    cambiarConsulta({ recurso: destino, acceso: { estado: 'carga' } });
    programar(() => {
      if (solicitud !== solicitudActual.current) {
        cambiarMensaje('Se descartó la respuesta tardía del despacho anterior.');
        return;
      }
      const acceso: Acceso = resultado === 'lista' || resultado === 'falloImagen'
        ? { estado: 'lista', urlAutorizada: resultado === 'falloImagen' ? '/ejemplos/recursos/archivo-no-imagen.txt' : `/ejemplos/recursos/evidencia-${destino === 'DEMO-A' ? 'a' : 'b'}.svg` }
        : { estado: resultado as Exclude<EstadoVisorEvidencia, 'lista'> };
      cambiarConsulta({ recurso: destino, acceso });
    }, demora);
  }

  function abrir() {
    temporizadores.current.forEach(window.clearTimeout);
    temporizadores.current.clear();
    cambiarAbierto(true);
    cambiarMensaje('Consulta simulada en curso.');
    const cambia = escenario === 'cambioDespacho' || escenario === 'respuestaTardia';
    solicitar('DEMO-A', cambia || escenario === 'revocacion' ? 'lista' : escenario, escenario === 'respuestaTardia' ? 4500 : 600);
    if (cambia) programar(() => solicitar('DEMO-B', 'lista'), escenario === 'respuestaTardia' ? 300 : 2500);
    if (escenario === 'revocacion') programar(() => { ++solicitudActual.current; cambiarConsulta({ recurso: 'DEMO-A', acceso: { estado: 'sinPermiso' } }); }, 2500);
  }

  function cerrar() {
    ++solicitudActual.current;
    temporizadores.current.forEach(window.clearTimeout);
    temporizadores.current.clear();
    cambiarConsulta(undefined);
    cambiarAbierto(false);
    cambiarMensaje('Visor cerrado; se retiró la referencia temporal del contenedor.');
  }

  // Nunca se entrega una respuesta del recurso anterior, ni antes de ejecutar un efecto.
  const acceso: Acceso = consulta?.recurso === recurso ? consulta.acceso : { estado: 'carga' };

  return <Container size="sm" py="xl" component="main">
    <Stack gap="lg">
      <div>
        <Title order={1}>Consultar evidencia</Title>
        <Text>Ejemplo de desarrollo con imágenes de prueba. El acceso es simulado; no se conecta a un servicio ni usa autorizaciones reales.</Text>
      </div>
      <NativeSelect label="Caso a revisar" value={escenario} onChange={(evento) => cambiarEscenario(evento.currentTarget.value)} data={[
        { value: 'lista', label: 'Evidencia disponible' },
        { value: 'sinEvidencia', label: 'Sin fotografía' },
        { value: 'expirada', label: 'Enlace expirado y renovación' },
        { value: 'error', label: 'Error al solicitar acceso' },
        { value: 'sinPermiso', label: 'Acceso denegado' },
        { value: 'falloImagen', label: 'Fallo de imagen con acceso obtenido' },
        { value: 'cambioDespacho', label: 'Cambiar de DEMO-A a DEMO-B con el visor abierto' },
        { value: 'revocacion', label: 'Retirar permisos con la imagen abierta' },
        { value: 'respuestaTardia', label: 'Descartar una respuesta tardía de DEMO-A' },
      ]} />
      <Button onClick={abrir}>Ver evidencia de prueba</Button>
      <Text role="status">{mensaje}</Text>
      <VisorEvidencia
        {...acceso}
        abierto={abierto}
        descripcion={`Evidencia de entrega del despacho ${recurso}`}
        alCerrar={cerrar}
        alSolicitarAcceso={() => solicitar(recurso, 'lista')}
        alFallarImagen={() => {
          cambiarConsulta({ recurso, acceso: { estado: 'error' } });
          cambiarMensaje('El contenedor recibió el fallo de imagen; el visor no deduce si el acceso expiró.');
        }}
      />
    </Stack>
  </Container>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><MantineProvider theme={tema}><EjemploVisorEvidencia /></MantineProvider></StrictMode>);
