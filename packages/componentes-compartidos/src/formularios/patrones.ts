import type { ActionIconProps, ButtonProps, NumberInputProps, SelectProps, TextareaProps } from '@mantine/core';
import type { DatePickerInputProps } from '@mantine/dates';
import 'dayjs/locale/es';

/** CR-01: props para controles Mantine nativos; el consumidor aporta eventos y estados. */
export const accionesUi = {
  principal: { variant: 'filled', color: 'orange.7' },
  secundaria: { variant: 'outline', color: 'orange.8' },
  terciaria: { variant: 'subtle', color: 'orange.8' },
  destructiva: { variant: 'filled', color: 'red.8', autoContrast: false },
} satisfies Record<string, ButtonProps>;

export const accionesIconoUi = {
  escritorio: { variant: 'subtle', color: 'orange.8', size: 'lg' },
  movil: { variant: 'subtle', color: 'orange.8', size: 'xl' },
} satisfies Record<string, ActionIconProps>;

/** CR-02: sin validaciones de negocio ni conversiones implícitas de valores vacíos. */
export const camposFormulario = {
  moneda: {
    leftSection: 'PEN', leftSectionWidth: 48,
    decimalScale: 2, fixedDecimalScale: true,
  } satisfies NumberInputProps,
  seleccion: { nothingFoundMessage: 'Sin resultados' } satisfies SelectProps,
  comentario: { autosize: true, minRows: 3 } satisfies TextareaProps,
  fecha: {
    locale: 'es', valueFormat: 'DD/MM/YYYY',
    ariaLabels: { nextMonth: 'Mes siguiente', previousMonth: 'Mes anterior', monthLevelControl: 'Seleccionar mes', yearLevelControl: 'Seleccionar año' },
  } satisfies DatePickerInputProps,
};
