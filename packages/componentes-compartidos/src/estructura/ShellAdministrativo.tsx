import { useState, type ReactNode } from 'react';
import { Anchor, AppShell, Box, Burger, Drawer, Group, NavLink, Stack, Text } from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';

type DestinoAdministrativo = { id: string; ruta: string; etiqueta: string; icono?: ReactNode };

/** CR-03 básico, sin resolver identidad ni permisos. */
export function ShellAdministrativo({ destinos, destinoActivo, alNavegar, children, contexto }: {
  destinos: DestinoAdministrativo[]; destinoActivo: string | null;
  alNavegar: (id: string, ruta: string) => void; children: ReactNode; contexto?: ReactNode;
}) {
  const [abierto, establecerAbierto] = useState(false);
  const close = () => establecerAbierto(false);
  const navegacion = (compacta: boolean) => <Stack component="nav" aria-label="Navegación administrativa" gap="xs">
    {destinos.map((destino) => <NavLink key={destino.id} component="a" href={destino.ruta}
      label={compacta ? <Box visibleFrom="lg">{destino.etiqueta}</Box> : destino.etiqueta}
      aria-label={destino.etiqueta} title={destino.etiqueta} leftSection={destino.icono}
      active={destinoActivo === destino.id} aria-current={destinoActivo === destino.id ? 'page' : undefined}
      mih={44} onClick={(evento) => {
        if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
        evento.preventDefault(); close(); alNavegar(destino.id, destino.ruta);
      }} />)}
  </Stack>;
  return <AppShell header={{ height: 64 }} navbar={{ width: { sm: 72, lg: 256 }, breakpoint: 'sm' }} padding={{ base: 'md', lg: 'lg' }}>
    <AppShell.Header bg="ink.9" c="white">
      <Group h="100%" px="md" wrap="nowrap">
        <Burger opened={abierto} onClick={() => establecerAbierto(true)} hiddenFrom="sm" color="white" aria-label="Abrir menú" aria-expanded={abierto} />
        <IconPackage size={26} aria-hidden="true" />
        <Text fw={700} size="sm">DESPACHO · ADMINISTRACIÓN</Text>
        <Anchor href="#contenido-principal" c="white" size="sm" ml="auto">Ir al contenido</Anchor>
        {contexto}
      </Group>
    </AppShell.Header>
    <AppShell.Navbar p="xs" visibleFrom="sm">{navegacion(true)}</AppShell.Navbar>
    <Drawer opened={abierto} onClose={close} title="Navegación" size="xs" closeButtonProps={{ 'aria-label': 'Cerrar menú' }}>{navegacion(false)}</Drawer>
    <AppShell.Main id="contenido-principal" tabIndex={-1} style={{ minWidth: 0 }}>
      <Box maw={1320} mx="auto" style={{ minWidth: 0 }}>{children}</Box>
    </AppShell.Main>
  </AppShell>;
}
