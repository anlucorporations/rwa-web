import tseslint from "typescript-eslint";

/**
 * Lint del paquete compartido. El código generado en `src/contracts/` se excluye:
 * procede de `rwa-sc` y su control de calidad es el gate `check-contract-drift`.
 */
export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    ignores: ["src/contracts/**", "node_modules/**"],
  },
);
