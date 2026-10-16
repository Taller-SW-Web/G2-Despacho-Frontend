import { createTheme } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';

const orange: MantineColorsTuple = ['#FFF4E6', '#FCE3D0', '#FFD8A8', '#FFC078', '#FFA94D', '#FF922B', '#FD7E14', '#F76707', '#C2410C', '#9A3412'];
const volt: MantineColorsTuple = ['#FBFEE0', '#F5FCC2', '#EEF7B0', '#E4F48A', '#D9EF5E', '#CFEA33', '#C8E81A', '#C3E504', '#9DB803', '#5C6B00'];
const signal: MantineColorsTuple = ['#EEF0FE', '#E1E6FB', '#C3CDF8', '#A2B1F4', '#8297F2', '#6A82F0', '#5670EF', '#4361EE', '#3550D4', '#1B2A99'];
const ink: MantineColorsTuple = ['#F5F4F2', '#E4E2DD', '#C9C5BC', '#A39E92', '#7D776A', '#5A5447', '#46402F', '#3A362C', '#26221A', '#1B1812'];
const cloud: MantineColorsTuple = ['#FFFFFF', '#F7F5F0', '#EDEAE2', '#E2DED3', '#D6D2C4', '#BDB8A8', '#A39E8D', '#888372', '#6D6858', '#524E40'];

export const tema = createTheme({
  primaryColor: 'orange', primaryShade: 7, autoContrast: true, luminanceThreshold: 0.2,
  black: '#1B1812', white: '#FFFFFF', colors: { orange, volt, signal, ink, cloud },
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: { fontFamily: 'Oswald, sans-serif', fontWeight: '700' },
  defaultRadius: 'sm',
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  components: {
    Button: { defaultProps: { size: 'md', radius: 'sm' } },
    Card: { defaultProps: { radius: 'md', padding: 'md', withBorder: true } },
    TextInput: { defaultProps: { size: 'md' } },
  },
});
