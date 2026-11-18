import { defineConfig } from '@playwright/test';

// Requiere el Compose desechable de distritos del backend, sin bases de desarrollo.
export default defineConfig({
  testDir: './pruebas/distritos',
  outputDir: './test-results/distritos',
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4187',
    viewport: { width: 1440, height: 1024 },
    trace: 'off', // Las trazas de transporte contienen los JWT ficticios del emisor temporal.
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -w @despacho/administrativo -- --host 127.0.0.1 --port 4187 --strictPort',
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: 'http://127.0.0.1:18080',
      VITE_DEV_TOKEN: '',
      VITE_DEMO_SIN_AUTENTICACION: 'false',
      VITE_SEGURIDAD_LOCAL: 'false',
    },
  },
});
