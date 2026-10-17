import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Solo el servidor de desarrollo accede al emisor temporal. No se publica en preview/build.
    proxy: Object.fromEntries([
      '/pruebas/token-usuario',
      '/api/v1/auth/token',
    ].map((ruta) => [`^/__f01/seguridad${ruta}$`, {
      target: 'http://127.0.0.1:8090',
      changeOrigin: true,
      rewrite: (rutaOriginal: string) => rutaOriginal.replace('/__f01/seguridad', ''),
    }])),
  },
});
