import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// host: true permite abrir la app desde un teléfono Android en la misma red durante el desarrollo.
export default defineConfig({ plugins: [react()], server: { port: 5174, host: true,
  proxy: { '/__sesion-local/codigo-otp': { target: 'http://127.0.0.1:8090', changeOrigin: true,
    rewrite: () => '/pruebas/codigo-otp' } },
}, preview: { port: 4174, host: true } });
