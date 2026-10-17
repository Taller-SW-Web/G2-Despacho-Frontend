import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useClienteApi } from '../../cliente/useClienteApi';
import type { Pagina } from './modelo';
import { mensajeError, sinPermiso } from './api';
import type { ClienteApi } from '../../cliente/useClienteApi';

export type FiltrosCatalogo = Record<string, string>;
export type DefinicionFiltro = { clave: string; etiqueta: string; opciones?: { value: string; label: string }[]; maximoCaracteres?: number };

export function useCatalogoFlota<T>(listar: (cliente: ClienteApi, parametros: URLSearchParams, signal: AbortSignal) => Promise<Pagina<T>>,
  definiciones: DefinicionFiltro[]) {
  const cliente = useClienteApi();
  const [parametros, establecerParametros] = useSearchParams();
  const clave = parametros.toString();
  const { filtros, pagina, tamanoPagina, errores, solicitud } = useMemo(() => {
    const actuales = new URLSearchParams(clave);
    const pagina = Number(actuales.get('pagina') ?? 1);
    const tamanoPagina = Number(actuales.get('tamanoPagina') ?? 50);
    const errores: string[] = [];
    if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 2147483647) errores.push('La página debe ser un entero entre 1 y 2147483647.');
    if (![20, 50, 100].includes(tamanoPagina)) errores.push('Selecciona un tamaño de página válido.');
    const filtros: FiltrosCatalogo = {};
    const solicitud = new URLSearchParams({ pagina: String(pagina), tamanoPagina: String(tamanoPagina) });
    for (const filtro of definiciones) {
      const valor = actuales.get(filtro.clave)?.trim() ?? '';
      filtros[filtro.clave] = valor;
      if (valor && filtro.opciones && !filtro.opciones.some((opcion) => opcion.value === valor)) errores.push(`Revisa el filtro ${filtro.etiqueta.toLowerCase()}.`);
      if (valor && filtro.maximoCaracteres && valor.length > filtro.maximoCaracteres) errores.push(`El filtro ${filtro.etiqueta.toLowerCase()} admite como máximo ${filtro.maximoCaracteres} caracteres.`);
      if (valor) solicitud.set(filtro.clave, valor);
    }
    return { filtros, pagina, tamanoPagina, errores, solicitud };
  }, [clave, definiciones]);
  const [revision, cambiarRevision] = useState(0);
  const [consulta, establecerConsulta] = useState<{ resultado: { clave: string; pagina: Pagina<T> } | null; cargando: boolean; error: string; denegado: boolean }>({ resultado: null, cargando: true, error: '', denegado: false });
  const generacion = useRef(0);
  const controlador = useRef<AbortController | null>(null);
  const denegar = useCallback(() => {
    generacion.current += 1;
    controlador.current?.abort();
    establecerConsulta({ resultado: null, cargando: false, error: 'Tu sesión no permite acceder a estos datos.', denegado: true });
  }, []);
  useEffect(() => {
    const id = ++generacion.current;
    const control = new AbortController();
    controlador.current = control;
    if (errores.length) {
      establecerConsulta((anterior) => ({ ...anterior, cargando: false }));
      return () => control.abort();
    }
    establecerConsulta((anterior) => ({ ...anterior, cargando: true, error: '' }));
    listar(cliente, solicitud, control.signal).then((resultado) => {
      if (id !== generacion.current || control.signal.aborted) return;
      if (resultado.pagina !== pagina || resultado.tamanoPagina !== tamanoPagina) throw new Error('Paginación no correspondiente');
      const ultima = Math.max(1, resultado.totalPaginas);
      if (pagina > ultima) {
        const siguientes = new URLSearchParams(clave); siguientes.set('pagina', String(ultima));
        establecerParametros(siguientes, { replace: true }); return;
      }
      establecerConsulta({ resultado: { clave, pagina: resultado }, cargando: false, error: '', denegado: false });
    }).catch((error: unknown) => {
      if (id !== generacion.current || control.signal.aborted) return;
      if (sinPermiso(error)) denegar();
      else establecerConsulta((anterior) => ({ ...anterior, cargando: false, error: mensajeError(error, 'consulta') }));
    });
    return () => { control.abort(); };
  }, [cliente, clave, revision, listar, errores.length, solicitud, pagina, tamanoPagina, establecerParametros, denegar]);
  const cambiar = (cambios: FiltrosCatalogo) => {
    const siguientes = new URLSearchParams(parametros);
    siguientes.delete('pagina');
    for (const [campo, valor] of Object.entries(cambios)) {
      if (valor) siguientes.set(campo, valor); else siguientes.delete(campo);
    }
    establecerParametros(siguientes);
  };
  const actualizar = () => cambiarRevision((valor) => valor + 1);
  const tieneFiltros = Object.values(filtros).some(Boolean);
  const confirmada = Boolean(consulta.resultado?.clave === clave && !consulta.cargando && !consulta.error && !errores.length && !consulta.denegado);
  return { ...consulta, cliente, filtros, pagina, tamanoPagina, errores, confirmada, tieneFiltros, cambiar, actualizar, denegar,
    limpiar: () => establecerParametros(new URLSearchParams({ tamanoPagina: String([20, 50, 100].includes(tamanoPagina) ? tamanoPagina : 50) })) };
}
