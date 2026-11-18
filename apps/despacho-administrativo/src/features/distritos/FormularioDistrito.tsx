import type { FormEventHandler } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { Alert, Button, Fieldset, Select, Stack, TextInput } from '@mantine/core';
import type { DatosDistrito, DistritoAdministrable } from './tipos';

type Propiedades = {
  formulario: UseFormReturn<DatosDistrito>;
  original: DistritoAdministrable | null;
  bloqueado: boolean;
  guardando: boolean;
  error: string | null;
  conflicto: boolean;
  alGuardar: FormEventHandler<HTMLFormElement>;
  alLimpiar: () => void;
  alRevisar: () => void;
};

export function FormularioDistrito({
  formulario,
  original,
  bloqueado,
  guardando,
  error,
  conflicto,
  alGuardar,
  alLimpiar,
  alRevisar,
}: Propiedades) {
  const {
    register,
    control,
    formState: { errors },
  } = formulario;
  const protegido = original && !original.identidadEditable;
  return (
    <Stack>
      {protegido && (
        <Alert title="Identidad protegida">
          {original.catalogoBase
            ? 'El nombre y el ubigeo pertenecen al catálogo base y están protegidos para conservar la integración con los canales.'
            : 'El nombre y el ubigeo están protegidos porque el distrito tiene asociaciones de cobertura.'}
        </Alert>
      )}
      {error && (
        <Alert color="red" title="No se pudo guardar">
          {error}
        </Alert>
      )}
      {conflicto && (
        <Alert title="Revisa los datos actuales">
          Los valores ingresados se conservan. Consulta el estado actual antes de preparar una nueva
          edición.
          <Button variant="default" disabled={bloqueado} onClick={alRevisar}>
            Revisar datos actuales
          </Button>
        </Alert>
      )}
      <form onSubmit={alGuardar}>
        <Fieldset variant="unstyled" disabled={bloqueado}>
          <Stack gap="md">
            <TextInput
              label="Nombre del distrito"
              required
              maxLength={100}
              readOnly={Boolean(protegido)}
              error={errors.nombre?.message}
              {...register('nombre')}
            />
            <Controller
              name="provincia"
              control={control}
              render={({ field }) => (
                <Select
                  label="Provincia"
                  required
                  allowDeselect={false}
                  data={['Lima', 'Callao']}
                  {...field}
                  onChange={(valor) => field.onChange(valor ?? 'Lima')}
                  error={errors.provincia?.message}
                />
              )}
            />
            <Controller
              name="departamento"
              control={control}
              render={({ field }) => (
                <Select
                  label="Departamento"
                  required
                  allowDeselect={false}
                  data={['Lima', 'Callao']}
                  {...field}
                  onChange={(valor) => field.onChange(valor ?? 'Lima')}
                  error={errors.departamento?.message}
                />
              )}
            />
            <TextInput
              label="Ubigeo"
              required
              inputMode="numeric"
              maxLength={6}
              readOnly={Boolean(protegido)}
              description="Seis dígitos. Se conservan los ceros iniciales del Callao."
              error={errors.ubigeo?.message}
              {...register('ubigeo')}
            />
            <Button type="submit" loading={guardando} disabled={bloqueado || conflicto}>
              {original ? 'Guardar cambios' : 'Guardar distrito'}
            </Button>
            <Button type="button" variant="default" disabled={bloqueado} onClick={alLimpiar}>
              {original ? 'Cancelar edición' : 'Limpiar formulario'}
            </Button>
          </Stack>
        </Fieldset>
      </form>
    </Stack>
  );
}
