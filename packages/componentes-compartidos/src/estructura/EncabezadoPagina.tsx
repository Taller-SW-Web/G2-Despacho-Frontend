import type { ReactNode } from 'react';
import { Anchor, Box, Breadcrumbs, Stack, Text, Title } from '@mantine/core';
import type { DestinoUi } from '../tipos-ui';
import clases from './EncabezadoPagina.module.css';

export type PropiedadesEncabezadoPagina = {
  titulo: string;
  subtitulo?: string;
  migas?: DestinoUi[];
  acciones?: ReactNode;
  pestanias?: ReactNode;
  alNavegarMiga?: (destino: DestinoUi) => void;
};

/** CR-05: rutas y disponibilidad de las acciones pertenecen al consumidor. */
export function EncabezadoPagina({ titulo, subtitulo, migas = [], acciones, pestanias, alNavegarMiga }: PropiedadesEncabezadoPagina) {
  return <Stack component="header" gap="lg" className={clases.raiz}>
    {migas.length > 0 && <Box component="nav" aria-label="Ruta de navegación">
      <Breadcrumbs classNames={{ root: clases.migas, breadcrumb: clases.miga }}>
        {migas.map((miga, indice) => indice === migas.length - 1
          ? <Text key={miga.id} component="span" size="sm" aria-current="page">{miga.etiqueta}</Text>
          : <Anchor key={miga.id} href={miga.ruta} size="sm" c="orange.8" onClick={(evento) => {
            if (alNavegarMiga && evento.button === 0 && !evento.ctrlKey && !evento.metaKey && !evento.shiftKey && !evento.altKey) {
              evento.preventDefault();
              alNavegarMiga(miga);
            }
          }}>{miga.etiqueta}</Anchor>)}
      </Breadcrumbs>
    </Box>}
    <div className={clases.fila}>
      <Stack gap="xs" className={clases.textos}>
        <Title order={1}>{titulo}</Title>
        {subtitulo && <Text c="gray.7">{subtitulo}</Text>}
      </Stack>
      {acciones && <div className={clases.acciones}>{acciones}</div>}
    </div>
    {pestanias}
  </Stack>;
}
