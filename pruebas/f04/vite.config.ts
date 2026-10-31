import { mergeConfig } from 'vite';
import base from '../../apps/despacho-administrativo/vite.config';

// Proxy exclusivo de pruebas hacia Gestión aislada; no reemplaza el Gateway del despliegue.
export default mergeConfig(base, { server: { host: '127.0.0.1', port: 4184, strictPort: true,
  proxy: { '/api': { target: 'http://127.0.0.1:18085', changeOrigin: true } } } });
