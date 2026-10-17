import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './pruebas/f02', workers: 1, timeout: 30_000,
  expect: { timeout: 10_000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4182', viewport: { width: 1440, height: 1024 }, trace: 'off', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -w @despacho/administrativo -- --host 127.0.0.1 --port 4182 --strictPort',
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:4182' },
    url: 'http://127.0.0.1:4182', reuseExistingServer: false,
  },
});
