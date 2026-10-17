import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['../../packages/componentes-compartidos/pruebas/preparacion.ts'],
    include: ['src/features/**/*.test.tsx', 'src/sesion/**/*.test.tsx'],
    clearMocks: true,
    // Limita la carga simultánea de JSDOM y deja margen a recorridos largos de teclado.
    maxWorkers: 2,
    testTimeout: 15000,
  },
});
