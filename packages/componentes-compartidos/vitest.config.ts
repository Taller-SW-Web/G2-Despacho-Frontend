import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./pruebas/preparacion.ts'],
    include: ['src/**/*.test.tsx'],
    clearMocks: true,
  },
});
