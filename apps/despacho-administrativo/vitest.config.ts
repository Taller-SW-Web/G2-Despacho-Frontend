import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['../../packages/componentes-compartidos/pruebas/preparacion.ts'],
    include: ['src/features/entregas-fallidas/**/*.test.tsx'],
    clearMocks: true,
  },
});
