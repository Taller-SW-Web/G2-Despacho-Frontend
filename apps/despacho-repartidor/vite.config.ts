import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// host: true permite abrir la app desde un teléfono Android en la misma red durante el desarrollo.
export default defineConfig({ plugins: [react()], server: { port: 5174, host: true }, preview: { port: 4174, host: true } });
