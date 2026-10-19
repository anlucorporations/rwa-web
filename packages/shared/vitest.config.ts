import { defineConfig } from 'vitest/config';

/**
 * Tests unitarios del paquete compartido (O3.6).
 * Cubren la lógica crítica sin BD ni red: EIP-712 del claim, sesión SIWE (cookie
 * firmada), validación de documentos y serializadores de la API.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // Cobertura de los módulos críticos unit-testables. La sesión SIWE
      // (auth/index + routes, con BD) se verifica con scripts/test_auth_o1.sh (30/30).
      include: [
        'src/claims/**/*.ts',
        'src/media/**/*.ts',
        'src/validation/**/*.ts',
        'src/api/serializers.ts',
        'src/api/client.ts',
      ],
      exclude: ['**/*.test.ts', 'src/contracts/**'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 60,
      },
    },
  },
});
