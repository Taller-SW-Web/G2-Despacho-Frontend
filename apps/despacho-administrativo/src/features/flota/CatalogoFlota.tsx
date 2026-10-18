import type { CSSProperties, ReactNode } from 'react';
import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { EncabezadoPagina, EstadoVista, FranjaEstado, TablaDatos, type ColumnaDatos, type EstadoConsulta } from '@despacho/componentes-compartidos';
import { FiltrosFlota } from './FiltrosFlota';
import type { DefinicionFiltro, useCatalogoFlota } from './useCatalogoFlota';

export function CatalogoFlota<T>({ titulo, subtitulo, etiquetaNuevo, consulta, definiciones, columnas, obtenerId, alNuevo, children, estiloFila }: {
  titulo: string; subtitulo: string; etiquetaNuevo: string; consulta: ReturnType<typeof useCatalogoFlota<T>>;
  definiciones: DefinicionFiltro[]; columnas: ColumnaDatos<T>[]; obtenerId: (fila: T) => string;
  alNuevo: () => void; children?: ReactNode;
  estiloFila?: (fila: T) => CSSProperties;
}) {
  if (consulta.denegado) return <EstadoVista estado="sinPermiso" alAccionar={consulta.actualizar} />;
  const datos = consulta.resultado?.pagina;
  const desfasada = Boolean(consulta.resultado && !consulta.confirmada);
  const estado: EstadoConsulta = !datos && consulta.cargando ? 'carga'
    : consulta.errores.length || !datos && consulta.error ? 'error'
    : datos?.contenido.length ? 'datos' : consulta.tieneFiltros ? 'sinResultados' : 'vacio';
  return <Stack gap="lg" style={{ minWidth: 0 }}>
    <EncabezadoPagina titulo={titulo} subtitulo={subtitulo} acciones={<Group>
      <Button variant="default" type="button" mih={44} disabled={consulta.cargando} onClick={consulta.actualizar} leftSection={<IconRefresh size={20} aria-hidden="true" />}>Actualizar</Button>
      <Button type="button" mih={44} disabled={!consulta.confirmada} onClick={alNuevo} leftSection={<IconPlus size={20} aria-hidden="true" />}>{etiquetaNuevo}</Button>
    </Group>} />
    <EstadoVista estado="datos">
      <Stack gap="lg">
        <FiltrosFlota definiciones={definiciones} filtros={consulta.filtros} consultando={consulta.cargando} alCambiar={consulta.cambiar} alLimpiar={consulta.limpiar} />
        {consulta.errores.length > 0 && <Alert color="red" variant="light" title="Revisa los filtros de la URL" role="alert">
          {consulta.errores.map((error) => <Text key={error}>{error}</Text>)}<Button type="button" variant="subtle" mih={44} onClick={consulta.limpiar}>Restablecer consulta</Button>
        </Alert>}
        {consulta.error && <Alert color="red" variant="light" title="No se pudo actualizar el listado" role="alert">
          {consulta.error}<Button type="button" variant="subtle" mih={44} onClick={consulta.actualizar}>Reintentar consulta</Button>
        </Alert>}
        {desfasada && <FranjaEstado tipo="datosDesactualizados"
          mensaje="Se conservan los resultados anteriores. Las acciones están bloqueadas hasta confirmar la consulta actual." />}
        <TablaDatos filas={datos?.contenido ?? []} obtenerId={obtenerId} columnas={columnas} tituloAccesible={`Catálogo de ${titulo.toLowerCase()}`}
          estado={estado} actualizando={!consulta.confirmada} estiloFila={estiloFila}
          paginacion={{ pagina: datos?.pagina ?? 1, tamanioPagina: datos?.tamanoPagina ?? consulta.tamanoPagina, total: datos?.totalElementos ?? 0 }}
          alCambiarPagina={(pagina) => consulta.cambiar({ pagina: String(pagina) })}
          alCambiarTamano={(tamano) => consulta.cambiar({ tamanoPagina: String(tamano) })}
          renderizarEstado={() => <EstadoVista estado={estado as Exclude<EstadoConsulta, 'carga' | 'datos'>}
            titulo={estado === 'vacio' ? `Aún no hay ${titulo.toLowerCase()} ${titulo === 'Furgonetas' ? 'registradas' : 'registrados'}` : undefined}
            accion={estado === 'vacio' ? { id: 'nuevo', etiqueta: etiquetaNuevo } : { id: 'recuperar', etiqueta: estado === 'sinResultados' ? 'Limpiar filtros' : 'Reintentar' }}
            alAccionar={estado === 'vacio' ? alNuevo : estado === 'sinResultados' ? consulta.limpiar : consulta.actualizar} />} />
        {children}
      </Stack>
    </EstadoVista>
  </Stack>;
}
