import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './pruebas/f04-cierre', workers: 1, timeout: 90_000,
  expect: { timeout: 10_000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4185', viewport: { width: 1440, height: 1024 }, timezoneId: 'Asia/Tokyo',
    channel: process.env.PLAYWRIGHT_F04_CHANNEL || undefined, trace: 'off', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -w @despacho/administrativo -- --config ../../pruebas/f04-cierre/vite.config.ts',
    env: { VITE_API_BASE_URL: '/', VITE_DEV_TOKEN: 'gestor', VITE_DEMO_SIN_AUTENTICACION: 'false' },
    url: 'http://127.0.0.1:4185', reuseExistingServer: false,
  },
});
