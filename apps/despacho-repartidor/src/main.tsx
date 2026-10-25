import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@despacho/componentes-compartidos/tokens.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';
import { tema } from '@despacho/componentes-compartidos';
import { Aplicacion } from './Aplicacion';
import { SesionProveedor } from './sesion/SesionProveedor';
import { registrarServiceWorker } from './pwa/registrarServiceWorker';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={tema} defaultColorScheme="light">
      <Notifications position="top-center" limit={3} />
      <BrowserRouter>
        <SesionProveedor><Aplicacion /></SesionProveedor>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
);

registrarServiceWorker();
