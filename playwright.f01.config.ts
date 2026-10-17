import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './pruebas/f01',
  workers: 1,
  timeout: 180000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 1024 },
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    // Las trazas HTTP incluirían los JWT del emisor temporal.
    trace: 'off',
  },
  webServer: {
    command: 'npm run dev:administrativo',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
