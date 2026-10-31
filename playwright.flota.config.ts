import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './pruebas/flota', workers: 1, timeout: 90_000,
  expect: { timeout: 15_000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4186', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -w @despacho/administrativo -- --host 127.0.0.1 --port 4186 --strictPort',
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:4186', VITE_DEV_TOKEN: '', VITE_DEMO_SIN_AUTENTICACION: 'false' },
    url: 'http://127.0.0.1:4186', reuseExistingServer: false,
  },
});
