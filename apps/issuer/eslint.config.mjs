import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { sharedRules } from "@rwa/config/eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Deuda declarada: los componentes se refactorizan en O4 (consolidación).
  // Las reglas del React Compiler y `no-explicit-any` quedan como aviso, no bloquean el CI.
  {
    rules: { ...sharedRules },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
