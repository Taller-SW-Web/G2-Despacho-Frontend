import { defineConfig } from '@playwright/test';
import distritos from './playwright.distritos.config';

// Usa exclusivamente el Compose desechable descrito en el README del backend.
export default defineConfig({
  ...distritos,
  testDir: './pruebas/geometrias',
  outputDir: './test-results/geometrias',
  timeout: 180000,
  use: { ...distritos.use, screenshot: 'only-on-failure' },
});
