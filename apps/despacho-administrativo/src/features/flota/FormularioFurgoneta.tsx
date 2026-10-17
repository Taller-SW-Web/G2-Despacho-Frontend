import { useState } from 'react';
import { Alert, NumberInput, SimpleGrid, TextInput } from '@mantine/core';
import { notificarOperacion } from '@despacho/componentes-compartidos';
import { editarFurgoneta, registrarFurgoneta } from './api';
import { datosFurgoneta, erroresCampos, limitesFurgoneta, type Furgoneta } from './modelo';
import { useOperacionFlota } from './useOperacionFlota';
import { ModalFormularioFlota } from './ModalFormularioFlota';
import type { ClienteApi } from '../../cliente/useClienteApi';

export function FormularioFurgoneta({ furgoneta, cliente, alCerrar, alGuardar, alDenegar }: {
  furgoneta?: Furgoneta; cliente: ClienteApi; alCerrar: () => void; alGuardar: () => void; alDenegar: () => void;
}) {
  const [placa, establecerPlaca] = useState(furgoneta?.placa ?? '');
  const [peso, establecerPeso] = useState<string | number>(furgoneta?.capacidadPesoKg ?? '');
  const [volumen, establecerVolumen] = useState<string | number>(furgoneta?.capacidadVolumenM3 ?? '');
  const [paquetes, establecerPaquetes] = useState<string | number>(furgoneta?.maximoPaquetes ?? '');
  const [tocados, establecerTocados] = useState<Record<string, boolean>>({});
  const operacion = useOperacionFlota(alDenegar);
  const valores = { placa: placa.trim().toUpperCase(), capacidadPesoKg: peso, capacidadVolumenM3: volumen, maximoPaquetes: paquetes };
  const validacion = (furgoneta ? limitesFurgoneta : datosFurgoneta).safeParse(valores);
  const errores = validacion.success ? {} : erroresCampos(validacion.error);
  const tocar = (campo: string) => establecerTocados((anteriores) => ({ ...anteriores, [campo]: true }));
  return <ModalFormularioFlota titulo={furgoneta ? 'Editar furgoneta' : 'Nueva furgoneta'} {...operacion} invalido={!validacion.success}
    alCerrar={alCerrar} alEnviar={(evento) => {
      evento.preventDefault(); if (!validacion.success) return;
      void operacion.ejecutar(furgoneta ? 'edicion' : 'registro', async () => {
        const confirmado = furgoneta
          ? await editarFurgoneta(cliente, furgoneta.idFurgoneta, limitesFurgoneta.parse(valores))
          : await registrarFurgoneta(cliente, datosFurgoneta.parse(valores));
        if (furgoneta && confirmado.idFurgoneta !== furgoneta.idFurgoneta) throw new Error('Recurso no correspondiente');
        if (confirmado.placa !== valores.placa) throw new Error('Identidad no correspondiente');
        if (!operacion.estaVigente()) return;
        notificarOperacion({ id: `furgoneta-${confirmado.idFurgoneta}`, tipo: 'exito', mensaje: furgoneta ? 'Límites de la furgoneta actualizados para jornadas futuras.' : 'Furgoneta registrada correctamente.' });
        alGuardar();
      });
    }}>
    <TextInput label="Placa" required readOnly={Boolean(furgoneta)} value={placa} maxLength={10} onBlur={() => tocar('placa')}
      error={operacion.campos.placa ?? (!furgoneta && operacion.conflicto ? 'Revisa si esta placa ya está registrada.' : tocados.placa ? errores.placa : undefined)} onChange={(evento) => { establecerPlaca(evento.currentTarget.value); operacion.corregirCampo('placa'); }} />
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <NumberInput required label="Límite de peso (kg)" value={peso} onChange={(valor) => { establecerPeso(valor); operacion.corregirCampo('capacidadPesoKg'); }} onBlur={() => tocar('capacidadPesoKg')}
        description="Mayor que cero; hasta 3 decimales y 9999999.999 kg."
        error={operacion.campos.capacidadPesoKg ?? (tocados.capacidadPesoKg ? errores.capacidadPesoKg : undefined)} hideControls />
      <NumberInput required label="Límite de volumen (m³)" value={volumen} onChange={(valor) => { establecerVolumen(valor); operacion.corregirCampo('capacidadVolumenM3'); }} onBlur={() => tocar('capacidadVolumenM3')}
        description="Mayor que cero; hasta 4 decimales y 999999.9999 m³."
        error={operacion.campos.capacidadVolumenM3 ?? (tocados.capacidadVolumenM3 ? errores.capacidadVolumenM3 : undefined)} hideControls />
      <NumberInput required label="Máximo de paquetes" value={paquetes} onChange={(valor) => { establecerPaquetes(valor); operacion.corregirCampo('maximoPaquetes'); }} onBlur={() => tocar('maximoPaquetes')}
        description="Cantidad entera entre 1 y 32767."
        error={operacion.campos.maximoPaquetes ?? (tocados.maximoPaquetes ? errores.maximoPaquetes : undefined)} hideControls />
    </SimpleGrid>
    {furgoneta && <Alert color="blue" variant="light" c="ink.9">Los nuevos límites se aplican a jornadas futuras. Las jornadas activas conservan su capacidad original.</Alert>}
  </ModalFormularioFlota>;
}
