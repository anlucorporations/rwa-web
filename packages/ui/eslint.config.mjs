import tseslint from "typescript-eslint";

/** Lint del paquete UI compartido (componentes de cliente). */
export default tseslint.config(...tseslint.configs.recommended, {
  ignores: ["node_modules/**"],
});
