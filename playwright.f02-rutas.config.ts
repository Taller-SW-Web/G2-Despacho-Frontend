import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './pruebas/f02-rutas', workers: 1, timeout: 60_000,
  expect: { timeout: 15_000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4186', viewport: { width: 1440, height: 1024 }, screenshot: 'only-on-failure', trace: 'off' },
  webServer: {
    command: 'npm run dev -w @despacho/administrativo -- --host 127.0.0.1 --port 4186 --strictPort --force',
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:18080', VITE_DEV_TOKEN: '', VITE_DEMO_SIN_AUTENTICACION: 'false' },
    url: 'http://127.0.0.1:4186', reuseExistingServer: false,
  },
});
