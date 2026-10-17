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
  },
});
