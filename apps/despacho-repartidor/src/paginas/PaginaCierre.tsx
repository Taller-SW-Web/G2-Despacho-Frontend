import { useCallback, useState } from 'react';
import { Alert, Button, Card, Drawer, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconLogout2, IconMoon, IconPackage } from '@tabler/icons-react';
import { BadgeEstado, EstadoVista, notificarOperacion } from '@despacho/componentes-compartidos';
import { useNavigate } from 'react-router-dom';
import { useOperacion } from '../api/ContextoOperacion';
import { aErrorOperacion } from '../api/errores';
import { esPendiente } from '../api/tipos';
import { CargandoTarjetas, ErrorConsulta, Pantalla } from '../componentes/Pantalla';
import { useConsulta } from '../componentes/useConsulta';
import { claveDeIntencion, liberarClave } from '../utilidades/claves';
import clases from './PaginaCierre.module.css';

/** 10 · Cerrar jornada y 10b · Confirmar cierre (ES-F03-07): los pendientes quedan No intentado, sin consumir intento. */
export function PaginaCierre() {
  const operacion = useOperacion();
  const navigate = useNavigate();
  const cargar = useCallback((signal: AbortSignal) => operacion.consultarRuta(signal), [operacion]);
  const { consulta, recargar } = useConsulta(cargar);
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ruta = consulta.estado === 'lista' ? consulta.datos : null;
  const pendientes = ruta?.despachos.filter((despacho) => esPendiente(despacho.estado)) ?? [];
  const entregados = ruta?.despachos.filter((despacho) => despacho.estado === 'ENTREGADO').length ?? 0;
  const plural = (cantidad: number, singular: string, varios: string) => `${cantidad} ${cantidad === 1 ? singular : varios}`;

  async function cerrar() {
    if (!ruta?.idJornada) return;
    const alcance = `cierre:${ruta.idJornada}`;
    setCerrando(true);
    setError(null);
    try {
      await operacion.cerrarJornada(ruta.idJornada, claveDeIntencion(alcance));
      liberarClave(alcance);
      notificarOperacion({ id: 'cierre-jornada', tipo: 'exito', mensaje: 'Jornada cerrada. Revisa los paquetes que debes devolver.' });
      navigate('/repartidor/resumen', { replace: true });
    } catch (fallo) {
      const traducido = aErrorOperacion(fallo);
      if (!traducido.reintentable) liberarClave(alcance);
      setError(traducido.message);
      setCerrando(false);
      if (traducido.tipo === 'conflicto') { setConfirmando(false); recargar(); }
    }
  }

  return (
    <Pantalla titulo="Cerrar jornada" seccion="cierre" estadoOperativo={ruta?.estadoOperativo ?? null}>
      {consulta.estado === 'cargando' && <CargandoTarjetas cantidad={2} />}
      {consulta.estado === 'error' && <ErrorConsulta error={consulta.error} alReintentar={recargar} />}
      {ruta && !ruta.idJornada && (
        <EstadoVista estado="vacio" titulo="No tienes una jornada activa" descripcion="Tu jornada ya está cerrada o aún no fue abierta por el Gestor."
          accion={{ id: 'resumen', etiqueta: 'Ver resumen' }} alAccionar={() => navigate('/repartidor/resumen')} />
      )}
      {ruta?.idJornada && (
        <Stack gap="md">
          {pendientes.length > 0 ? (
            <Alert color="yellow" icon={<IconAlertTriangle size={22} />} title={`${plural(pendientes.length, 'despacho sigue pendiente', 'despachos siguen pendientes')}`}>
              Al cerrar quedarán como No intentado. No consumen intento y debes devolver sus paquetes al centro de despacho.
            </Alert>
          ) : (
            <Alert color="green" icon={<IconCircleCheck size={22} />} title="Sin despachos pendientes">
              Todos tus despachos tienen resultado. Puedes cerrar tu jornada.
            </Alert>
          )}
          {pendientes.length > 0 && (
            <Stack gap="sm">
              <Text fw={700} c="var(--ia-color-text-secondary)">Quedarán como No intentado</Text>
              {pendientes.map((despacho) => (
                <Card key={despacho.idDespacho} padding="sm">
                  <Group wrap="nowrap" gap="md">
                    <IconPackage size={24} aria-hidden="true" />
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" c="var(--ia-color-text-secondary)">{despacho.codigoRastreoInterno}</Text>
                      <Text fw={700}>{despacho.direccion}{despacho.distrito ? `, ${despacho.distrito}` : ''}</Text>
                    </Stack>
                    <BadgeEstado contexto="despacho" valor={despacho.estado} size="sm" />
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
          {entregados > 0 && (
            <Alert color="green" icon={<IconCircleCheck size={20} />}>
              <Text fw={600} c="var(--ia-color-success-default)">{plural(entregados, 'despacho entregado hoy', 'despachos entregados hoy')}</Text>
            </Alert>
          )}
          {error && !confirmando && <Alert color="red" icon={<IconAlertCircle size={18} />} title="No se cerró la jornada" role="alert">{error}</Alert>}
          <Button fullWidth size="lg" leftSection={<IconLogout2 size={20} />} onClick={() => { setError(null); setConfirmando(true); }} mt="md">
            Cerrar jornada
          </Button>
        </Stack>
      )}

      <Drawer opened={confirmando} onClose={() => { if (!cerrando) setConfirmando(false); }} position="bottom" size={400}
        withCloseButton={false} radius="lg" closeOnClickOutside={!cerrando} closeOnEscape={!cerrando}
        overlayProps={{ backgroundOpacity: 0.55 }} classNames={{ content: clases.hoja }} aria-labelledby="titulo-cierre">
        <Stack gap="md" align="center" p="sm">
          <ThemeIcon size={64} radius="50%" color="orange" variant="light" aria-hidden="true">
            <IconMoon size={32} color="var(--ia-color-action-primary-hover)" />
          </ThemeIcon>
          <Title order={2} size="h3" id="titulo-cierre" ta="center" className={clases.tituloHoja}>¿Cerrar tu jornada?</Title>
          <Text ta="center" size="lg" c="var(--ia-color-text-secondary)">
            {pendientes.length > 0 ? `${plural(pendientes.length, 'despacho quedará', 'despachos quedarán')} como No intentado y p` : 'P'}asarás a Fuera de turno. Esta acción no se puede deshacer.
          </Text>
          {error && <Alert w="100%" color="red" icon={<IconAlertCircle size={18} />} role="alert">{error}</Alert>}
          <Button fullWidth size="lg" loading={cerrando} onClick={cerrar}>Sí, cerrar jornada</Button>
          <Button fullWidth size="lg" variant="default" disabled={cerrando} onClick={() => setConfirmando(false)}>Cancelar</Button>
        </Stack>
      </Drawer>
    </Pantalla>
  );
}
