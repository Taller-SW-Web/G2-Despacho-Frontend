import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Anchor, AppShell, Box, Burger, Drawer, Group, Menu, NavLink, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';
import clases from './ShellAdministrativo.module.css';

export type DestinoAdministrativo = { id: string; ruta: string; etiqueta: string; icono?: ReactNode };
export type PropiedadesShellAdministrativo = {
  destinos: DestinoAdministrativo[]; destinoActivo: string | null;
  usuario: { nombre: string; etiquetaPerfil: string };
  logoUrl: string; rutaInicio: string;
  alNavegar: (id: string, ruta: string) => void;
  alCerrarSesion: () => void;
  children: ReactNode; contexto?: ReactNode;
};

/** CR-03. El consumidor suministra identidad y destinos autorizados. */
export function ShellAdministrativo({ destinos, destinoActivo, alNavegar, children, contexto, usuario, logoUrl, rutaInicio, alCerrarSesion }: PropiedadesShellAdministrativo) {
  const [abierto, establecerAbierto] = useState(false);
  const disparador = useRef<HTMLButtonElement>(null);
  useEffect(() => { establecerAbierto(false); }, [destinoActivo]);
  const close = () => establecerAbierto(false);
  const navegacion = (compacta: boolean) => <Stack component="nav" aria-label="Navegación administrativa" gap="xs">
    {destinos.map((destino) => <NavLink key={destino.id} component="a" href={destino.ruta}
      label={compacta ? <Box visibleFrom="lg">{destino.etiqueta}</Box> : destino.etiqueta}
      aria-label={destino.etiqueta} title={destino.etiqueta} leftSection={destino.icono ?? <IconPackage size={20} aria-hidden="true" />}
      active={destinoActivo === destino.id} aria-current={destinoActivo === destino.id ? 'page' : undefined}
      mih={44} onClick={(evento) => {
        if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
        evento.preventDefault(); close(); alNavegar(destino.id, destino.ruta);
      }} />)}
  </Stack>;
  return <AppShell header={{ height: 64 }} navbar={{ width: { sm: 72, lg: 256 }, breakpoint: 'sm' }} padding={{ base: 'md', lg: 'lg' }}>
    <AppShell.Header bg="ink.9" c="white">
      <Group h="100%" px="md" wrap="nowrap">
        <Anchor href="#contenido-principal" className={clases.saltar}>Ir al contenido</Anchor>
        <Burger ref={disparador} opened={abierto} onClick={() => establecerAbierto(true)} hiddenFrom="sm" color="white" aria-label="Abrir menú" aria-expanded={abierto} aria-controls="menu-administrativo" w={44} h={44} />
        <Anchor href={rutaInicio} c="white" className={clases.marca}>
          {logoUrl ? <img src={logoUrl} alt="Inka Athletics" /> : <Text component="span" fw={700} size="sm">Inka Athletics</Text>}
        </Anchor>
        {contexto}
        <Menu position="bottom-end" returnFocus>
          <Menu.Target><UnstyledButton className={clases.usuario} aria-label={`Menú de usuario: ${usuario.nombre}`}>
            <Text size="sm" truncate>{usuario.nombre}</Text><Text size="xs" truncate>{usuario.etiquetaPerfil}</Text>
          </UnstyledButton></Menu.Target>
          <Menu.Dropdown><Menu.Item onClick={alCerrarSesion} mih={44}>Cerrar sesión</Menu.Item></Menu.Dropdown>
        </Menu>
      </Group>
    </AppShell.Header>
    <AppShell.Navbar p="xs" visibleFrom="sm">{navegacion(true)}</AppShell.Navbar>
    <Drawer id="menu-administrativo" opened={abierto} onClose={close} title="Navegación" position="left" size="xs" trapFocus returnFocus
      onExitTransitionEnd={() => disparador.current?.focus()} closeButtonProps={{ 'aria-label': 'Cerrar menú' }}>{navegacion(false)}</Drawer>
    <AppShell.Main id="contenido-principal" tabIndex={-1} style={{ minWidth: 0 }}>
      <Box maw={1320} mx="auto" style={{ minWidth: 0 }}>{children}</Box>
    </AppShell.Main>
  </AppShell>;
}
