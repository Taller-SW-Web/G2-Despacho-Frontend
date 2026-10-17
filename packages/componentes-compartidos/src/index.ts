import { createTheme } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';

export { EstadoVista } from './feedback/EstadoVista';
export { ShellAdministrativo } from './estructura/ShellAdministrativo';
export type { DestinoAdministrativo, PropiedadesShellAdministrativo } from './estructura/ShellAdministrativo';
export type { ContextoEstado } from './dominio/estados';
export { estadosPorContexto } from './dominio/estados';
export { EncabezadoPagina } from './estructura/EncabezadoPagina';
export { BarraFiltros } from './listados/BarraFiltros';
export { TablaDatos } from './listados/TablaDatos';
export type { ColumnaDatos } from './listados/TablaDatos';
export { TarjetaKpi } from './indicadores/TarjetaKpi';
export type { PropiedadesEstadoVista } from './feedback/EstadoVista';
export type { EstadoConsulta, AccionUi } from './tipos-ui';
export { BadgeEstado } from './dominio/BadgeEstado';
export type { PropiedadesBadgeEstado } from './dominio/BadgeEstado';
export { HistorialEstados } from './dominio/HistorialEstados';
export type { EntradaHistorialEstados, PropiedadesHistorialEstados } from './dominio/HistorialEstados';
export { ModalConfirmacion } from './formularios/ModalConfirmacion';
export type { PropiedadesModalConfirmacion } from './formularios/ModalConfirmacion';
export { VisorEvidencia } from './dominio/VisorEvidencia';
export type { EstadoVisorEvidencia, PropiedadesVisorEvidencia } from './dominio/VisorEvidencia';

const orange: MantineColorsTuple = ['#FFF4E6', '#FCE3D0', '#FFD8A8', '#FFC078', '#FFA94D', '#FF922B', '#FD7E14', '#F76707', '#C2410C', '#9A3412'];
const volt: MantineColorsTuple = ['#FBFEE0', '#F5FCC2', '#EEF7B0', '#E4F48A', '#D9EF5E', '#CFEA33', '#C8E81A', '#C3E504', '#9DB803', '#5C6B00'];
const signal: MantineColorsTuple = ['#EEF0FE', '#E1E6FB', '#C3CDF8', '#A2B1F4', '#8297F2', '#6A82F0', '#5670EF', '#4361EE', '#3550D4', '#1B2A99'];
const ink: MantineColorsTuple = ['#F5F4F2', '#E4E2DD', '#C9C5BC', '#A39E92', '#7D776A', '#5A5447', '#46402F', '#3A362C', '#26221A', '#1B1812'];
const cloud: MantineColorsTuple = ['#FFFFFF', '#F7F5F0', '#EDEAE2', '#E2DED3', '#D6D2C4', '#BDB8A8', '#A39E8D', '#888372', '#6D6858', '#524E40'];

export const tema = createTheme({
  primaryColor: 'orange', primaryShade: 7, autoContrast: true, luminanceThreshold: 0.2,
  black: '#1B1812', white: '#FFFFFF', colors: { orange, volt, signal, ink, cloud },
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: {
    fontFamily: 'Oswald, sans-serif', fontWeight: '700',
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
  breakpoints: { xs: '36em', sm: '48em', md: '62em', lg: '75em', xl: '88em' },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  components: {
    Button: { defaultProps: { size: 'md', radius: 'sm' } },
    Card: { defaultProps: { radius: 'md', padding: 'md', withBorder: true } },
    TextInput: { defaultProps: { size: 'md' } },
  },
});
