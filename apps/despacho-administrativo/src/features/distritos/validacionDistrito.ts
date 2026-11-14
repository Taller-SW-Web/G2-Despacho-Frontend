import { z } from 'zod';
import type { DatosDistrito } from './tipos';

export const DISTRITO_INICIAL: DatosDistrito = {
  nombre: '',
  provincia: 'Lima',
  departamento: 'Lima',
  ubigeo: '',
};

export const esquemaDistrito = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    provincia: z
      .string()
      .refine((valor) => valor === 'Lima' || valor === 'Callao', 'Selecciona Lima o Callao'),
    departamento: z
      .string()
      .refine((valor) => valor === 'Lima' || valor === 'Callao', 'Selecciona Lima o Callao'),
    ubigeo: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, 'Ingresa seis dígitos, conservando los ceros iniciales'),
  })
  .superRefine((datos, contexto) => {
    if (datos.provincia !== datos.departamento)
      contexto.addIssue({
        code: 'custom',
        path: ['departamento'],
        message: 'El departamento debe corresponder a la provincia',
      });
    if (
      !datos.ubigeo.startsWith(datos.provincia === 'Lima' ? '1501' : '0701') ||
      datos.ubigeo.endsWith('00')
    )
      contexto.addIssue({
        code: 'custom',
        path: ['ubigeo'],
        message: 'El ubigeo debe pertenecer al ámbito elegido (1501 o 0701; distrito 01 a 99)',
      });
  });
