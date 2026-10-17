import { Alert, Notification, createTheme, defaultVariantColorsResolver, getThemeColor } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';
import controles from './formularios/Controles.module.css';

export { logoInkaAthletics } from './marca';
export { accionesUi, accionesIconoUi, camposFormulario } from './formularios/patrones';
export { BarraAccionesFija } from './estructura/BarraAccionesFija';
export type { PropiedadesBarraAccionesFija } from './estructura/BarraAccionesFija';

export { EstadoVista } from './feedback/EstadoVista';
export { ShellAdministrativo } from './estructura/ShellAdministrativo';
export type { DestinoAdministrativo, PropiedadesShellAdministrativo } from './estructura/ShellAdministrativo';
export { notificarOperacion } from './feedback/NotificacionOperacion';
export type { EntradaNotificacionOperacion } from './feedback/NotificacionOperacion';
export type { ContextoEstado } from './dominio/estados';
export { estadosPorContexto } from './dominio/estados';
export { EncabezadoPagina } from './estructura/EncabezadoPagina';
export type { PropiedadesEncabezadoPagina } from './estructura/EncabezadoPagina';
export { BarraFiltros } from './listados/BarraFiltros';
export type { PropiedadesBarraFiltros } from './listados/BarraFiltros';
export { TablaDatos } from './listados/TablaDatos';
export type { ColumnaDatos, PropiedadesTablaDatos } from './listados/TablaDatos';
export { TarjetaKpi } from './indicadores/TarjetaKpi';
export type { PropiedadesTarjetaKpi } from './indicadores/TarjetaKpi';
export { FranjaEstado } from './feedback/FranjaEstado';
export type { PropiedadesFranjaEstado } from './feedback/FranjaEstado';
export type { PropiedadesEstadoVista } from './feedback/EstadoVista';
export type { EstadoConsulta, AccionUi, DestinoUi, FiltroActivoUi, OrdenUi, PaginacionUi } from './tipos-ui';
export { BadgeEstado } from './dominio/BadgeEstado';
export type { PropiedadesBadgeEstado } from './dominio/BadgeEstado';
export { HistorialEstados } from './dominio/HistorialEstados';
export type { EntradaHistorialEstados, PropiedadesHistorialEstados } from './dominio/HistorialEstados';
export { ModalConfirmacion } from './formularios/ModalConfirmacion';
export type { PropiedadesModalConfirmacion } from './formularios/ModalConfirmacion';
export { VisorEvidencia } from './dominio/VisorEvidencia';
export type { EstadoVisorEvidencia, PropiedadesVisorEvidencia } from './dominio/VisorEvidencia';
export { BarraOcupacion } from './dominio/BarraOcupacion';
export type { PropiedadesBarraOcupacion } from './dominio/BarraOcupacion';
export { TarjetaRepartidor } from './dominio/TarjetaRepartidor';
export type { PropiedadesTarjetaRepartidor } from './dominio/TarjetaRepartidor';

const orange: MantineColorsTuple = ['#FFF4E6', '#FCE3D0', '#FFD8A8', '#FFC078', '#FFA94D', '#FF922B', '#FD7E14', '#F76707', '#C2410C', '#9A3412'];
const volt: MantineColorsTuple = ['#FBFEE0', '#F5FCC2', '#EEF7B0', '#E4F48A', '#D9EF5E', '#CFEA33', '#C8E81A', '#C3E504', '#9DB803', '#5C6B00'];
const signal: MantineColorsTuple = ['#EEF0FE', '#E1E6FB', '#C3CDF8', '#A2B1F4', '#8297F2', '#6A82F0', '#5670EF', '#4361EE', '#3550D4', '#1B2A99'];
const ink: MantineColorsTuple = ['#F5F4F2', '#E4E2DD', '#C9C5BC', '#A39E92', '#7D776A', '#5A5447', '#46402F', '#3A362C', '#26221A', '#1B1812'];
const cloud: MantineColorsTuple = ['#FFFFFF', '#F7F5F0', '#EDEAE2', '#E2DED3', '#D6D2C4', '#BDB8A8', '#A39E8D', '#888372', '#6D6858', '#524E40'];

// SYSTEM-DESIGN §4.1: los semánticos usan el tono 8 (success/warning/error/info default) y el 0 como fondo.
// Con primaryShade 7, `color="red"` resolvería a red.7; aquí se normaliza para todas las pantallas.
const semanticos = ['red', 'green', 'yellow', 'blue'] as const;
type Semantico = (typeof semanticos)[number];
const nombreColor = (color: string) => color.split('.')[0];
const esSemantico = (color: string): color is Semantico => (semanticos as readonly string[]).includes(nombreColor(color));
const normalizarColor = (color: string) => (semanticos as readonly string[]).includes(color) ? `${color}.8` : color;

export const tema = createTheme({
  primaryColor: 'orange', primaryShade: 7, autoContrast: true, luminanceThreshold: 0.2,
  black: '#1B1812', white: '#FFFFFF', colors: { orange, volt, signal, ink, cloud },
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSizes: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
  lineHeights: { xs: '1rem', sm: '1.25rem', md: '1.5rem', lg: '1.625rem', xl: '1.75rem' },
  headings: {
    fontFamily: 'Oswald, "Segoe UI", sans-serif', fontWeight: '700',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.25' },
      h2: { fontSize: '1.75rem', lineHeight: '1.285714' },
      h3: { fontSize: '1.5rem', lineHeight: '1.333333' },
      h4: { fontSize: '1.25rem', lineHeight: '1.4' },
    },
  },
  defaultRadius: 'sm',
  radius: { xs: '0.25rem', sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '62.4375rem' },
  respectReducedMotion: true,
  focusClassName: 'ia-focus',
  // Mantine usa un tono claro para subtle incluso con color="orange.8".
  // Mantener la jerarquía y el contraste de CR-01 también en los slots de acciones.
  variantColorResolver: (entrada) => {
    const color = normalizarColor(entrada.color ?? entrada.theme.primaryColor);
    const colores = defaultVariantColorsResolver({ ...entrada, color });
    const { colors, black } = entrada.theme;
    // §4.4 y §16.0: el texto sobre fondos semánticos claros conserva el contraste ink.
    if (entrada.variant === 'light' && esSemantico(color)) {
      const nombre = nombreColor(color);
      return { ...colores, background: colors[nombre][0], hover: colors[nombre][1],
        color: black, hoverColor: black };
    }
    if (entrada.variant === 'light' && nombreColor(color) === 'gray') {
      return { ...colores, background: colors.cloud[2], hover: colors.cloud[3], color: black, hoverColor: black };
    }
    if (color !== 'orange' && !color.startsWith('orange.')) return colores;
    if (entrada.variant === 'outline' || entrada.variant === 'subtle') return {
      ...colores,
      color: entrada.theme.colors.orange[8],
      hoverColor: entrada.theme.colors.orange[8],
      ...(entrada.variant === 'outline' ? { border: `1px solid ${entrada.theme.colors.orange[8]}` } : {}),
    };
    if (entrada.variant === 'filled') return { ...colores, color: entrada.theme.black, hoverColor: entrada.theme.colors.cloud[1] };
    return colores;
  },
  breakpoints: { xs: '36em', sm: '48em', md: '62em', lg: '75em', xl: '88em' },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  components: {
    Button: {
      defaultProps: { size: 'md', radius: 'sm' },
      classNames: { root: controles.boton, inner: controles.interior, label: controles.etiqueta, loader: controles.cargador },
    },
    ActionIcon: { defaultProps: { variant: 'subtle', color: 'orange.8', size: 'lg' } },
    Badge: { defaultProps: { size: 'sm', radius: 'xl', variant: 'light' } },
    Card: { defaultProps: { radius: 'md', padding: 'md', withBorder: true } },
    Paper: { defaultProps: { radius: 'md' } },
    Modal: { defaultProps: { radius: 'lg', overlayProps: { backgroundOpacity: 0.55 } } },
    Drawer: { defaultProps: { position: 'right', size: 560 } },
    Table: { defaultProps: { verticalSpacing: 'sm', horizontalSpacing: 'md', highlightOnHover: true } },
    // §4.4: sobre fondos semánticos el contenido va en text/primary; el icono conserva el color semántico.
    Alert: Alert.extend({ defaultProps: { variant: 'light', radius: 'sm' },
      classNames: { root: controles.alerta, title: controles.tituloAlerta, message: controles.mensajeAlerta },
      vars: (theme, { color }) => ({ root: { '--alert-color': getThemeColor(normalizarColor(color ?? theme.primaryColor), theme) } }),
    }),
    Notification: Notification.extend({
      defaultProps: { radius: 'md', withBorder: true },
      classNames: { root: controles.notificacion, title: controles.tituloNotificacion, description: controles.mensajeNotificacion },
      vars: (theme, { color }) => ({ root: { '--notification-color': color ? getThemeColor(normalizarColor(color), theme) : undefined } }),
    }),
    TextInput: { defaultProps: { size: 'md' } },
    PasswordInput: { defaultProps: { size: 'md' } },
    NumberInput: { defaultProps: { size: 'md' } },
    Textarea: { defaultProps: { size: 'md' } },
    Checkbox: { defaultProps: { size: 'md' }, classNames: { body: controles.opcion, label: controles.etiquetaOpcion } },
    Radio: { defaultProps: { size: 'md' }, classNames: { body: controles.opcion, label: controles.etiquetaOpcion } },
    Select: { defaultProps: { size: 'md', nothingFoundMessage: 'Sin resultados' } },
    MultiSelect: { defaultProps: { size: 'md', nothingFoundMessage: 'Sin resultados' } },
    TagsInput: { defaultProps: { size: 'md' } },
    Input: { classNames: { input: controles.entrada } },
    InputWrapper: { classNames: { label: controles.etiquetaCampo, description: controles.ayudaCampo, error: controles.errorCampo } },
  },
});

export { ShellRepartidor } from './layout/ShellRepartidor';
export type { DestinoRepartidor } from './layout/ShellRepartidor';
export { TarjetaDespacho } from './dominio/TarjetaDespacho';
export type { TarjetaDespachoProps } from './dominio/TarjetaDespacho';
export { CapturaEvidencia } from './formularios/CapturaEvidencia';
export type {
  CapturaEvidenciaProps,
  FaseCapturaEvidencia,
  PoliticaArchivoEvidencia,
} from './formularios/CapturaEvidencia';
