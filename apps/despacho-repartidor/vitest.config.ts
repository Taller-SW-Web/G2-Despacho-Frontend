import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['../../packages/componentes-compartidos/pruebas/preparacion.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true,
    maxWorkers: 2,
    testTimeout: 15000,
  },
});
