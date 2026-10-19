/**
 * Reglas de ESLint comunes a las 3 apps (O4.2).
 *
 * RT-W-10/RF-W-16: nada de logs por consola en la app (usa el logger de servidor).
 * Las reglas del React Compiler y `no-explicit-any` quedan como aviso (deuda O4).
 */
export const sharedRules = {
  'react-hooks/immutability': 'warn',
  'react-hooks/set-state-in-effect': 'warn',
  'react-hooks/preserve-manual-memoization': 'warn',
  '@typescript-eslint/no-explicit-any': 'warn',
  'no-console': 'error',
};
