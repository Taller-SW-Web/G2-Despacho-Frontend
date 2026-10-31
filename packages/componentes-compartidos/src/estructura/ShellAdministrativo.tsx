import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Anchor, AppShell, Box, Burger, Drawer, Group, Menu, NavLink, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconLogout, IconPackage } from '@tabler/icons-react';
import { logoInkaAthletics } from '../marca';
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
  const iniciales = usuario.nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toLocaleUpperCase('es');
  const marca = (compacta: boolean) => <Anchor href={rutaInicio} className={clases.marca} data-compacta={compacta || undefined} aria-label="Inka Athletics · Despacho · Inicio">
    <span className={clases.simboloMarca} aria-hidden="true"><IconPackage size={28} /></span>
    <span className={clases.identidadMarca}>
      <img src={logoUrl || logoInkaAthletics} alt="Inka Athletics" className={logoUrl ? clases.logo : `${clases.logo} ${clases.logoLocal}`} />
      <span className={clases.nombreModulo}>Despacho</span>
    </span>
  </Anchor>;
  const navegacion = (compacta: boolean) => <Stack component="nav" aria-label="Navegación administrativa" gap="xs" className={clases.navegacion} data-compacta={compacta || undefined}>
    {destinos.map((destino) => <NavLink key={destino.id} component="a" href={destino.ruta}
      label={<span className={clases.etiquetaDestino}>{destino.etiqueta}</span>}
      className={clases.enlace} classNames={{ section: clases.iconoDestino }}
      aria-label={destino.etiqueta} title={destino.etiqueta} leftSection={destino.icono ?? <IconPackage size={24} aria-hidden="true" />}
      active={destinoActivo === destino.id} aria-current={destinoActivo === destino.id ? 'page' : undefined}
      mih={44} onClick={(evento) => {
        if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
        evento.preventDefault(); close(); alNavegar(destino.id, destino.ruta);
      }} />)}
  </Stack>;
  const contenidoLateral = (compacta: boolean) => <>
    {marca(compacta)}
    <div className={clases.perfil} data-compacto={compacta || undefined}>
      <Text component="span" size="xs" fw={600}>{usuario.etiquetaPerfil}</Text><span className={clases.puntoPerfil} aria-hidden="true" />
    </div>
    {navegacion(compacta)}
    <div className={clases.pieLateral} data-compacto={compacta || undefined}>
      <UnstyledButton type="button" onClick={alCerrarSesion} className={clases.cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">
        <IconLogout size={24} aria-hidden="true" /><span>Cerrar sesión</span>
      </UnstyledButton>
    </div>
  </>;
  return <AppShell layout="alt" header={{ height: 64 }} navbar={{ width: { sm: 72, lg: 256 }, breakpoint: 'sm', collapsed: { mobile: true } }}
    padding={{ base: 16, xs: 20, sm: 24, md: 32, xl: 40 }} transitionDuration={150}>
    <AppShell.Header className={clases.cabecera}>
      <Group h="100%" gap="md" wrap="nowrap" className={clases.contenidoCabecera}>
        <Anchor href="#contenido-principal" className={clases.saltar}>Ir al contenido</Anchor>
        <Burger ref={disparador} opened={abierto} onClick={() => establecerAbierto(true)} hiddenFrom="sm" color="var(--ia-color-text-primary)" aria-label="Abrir menú" aria-expanded={abierto} aria-controls="menu-administrativo" w={44} h={44} />
        <Box className={clases.contexto}>{contexto ?? <><Text size="xs" c="dimmed">CONTEXTO OPERATIVO</Text><Text size="sm" fw={500}>Despacho y entrega a domicilio</Text></>}</Box>
        <Menu position="bottom-end" returnFocus>
          <Menu.Target><UnstyledButton className={clases.usuario} aria-label={`Menú de usuario: ${usuario.nombre}`}>
            <span className={clases.datosUsuario}><Text component="span" size="sm" fw={600} truncate>{usuario.nombre}</Text><Text component="span" size="xs" c="dimmed" truncate>{usuario.etiquetaPerfil}</Text></span>
            <span className={clases.avatar} aria-hidden="true">{iniciales}</span><IconChevronDown size={16} aria-hidden="true" className={clases.desplegarUsuario} />
          </UnstyledButton></Menu.Target>
          <Menu.Dropdown><Menu.Item onClick={alCerrarSesion} leftSection={<IconLogout size={20} aria-hidden="true" />} mih={44}>Cerrar sesión</Menu.Item></Menu.Dropdown>
        </Menu>
      </Group>
    </AppShell.Header>
    <AppShell.Navbar className={clases.lateral} visibleFrom="sm">{contenidoLateral(true)}</AppShell.Navbar>
    <Drawer id="menu-administrativo" opened={abierto} onClose={close} title="Navegación" position="left" size={256} trapFocus returnFocus
      classNames={{ content: clases.menuMovil, header: clases.cabeceraMenu, body: clases.cuerpoMenu, close: clases.cerrarMenu }}
      onExitTransitionEnd={() => disparador.current?.focus()} closeButtonProps={{ 'aria-label': 'Cerrar menú' }}>{contenidoLateral(false)}</Drawer>
    <AppShell.Main id="contenido-principal" tabIndex={-1} className={clases.principal}>
      <Box maw={1320} mx="auto" className={clases.contenido}>{children}</Box>
    </AppShell.Main>
  </AppShell>;
}
