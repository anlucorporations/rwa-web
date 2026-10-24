# Fase 4 — Verificación de la etapa `@web`

> **Fecha:** 2026-10-19 · actualizado 2026-10-23 · **Línea:** `rwa-web` (`@web`) · **Alcance:** 3 apps + 3 paquetes.
> Comandos reproducibles y salida real de la última ejecución local.
> Estado de los criterios B-1…B-6 / C-1…C-5 del `INFORME_OPTIMIZACION_WEB_V1.md`.

## 1. Gate ejecutado

```bash
./scripts/ci_local.sh   # exit 0
```

| Paso | Comando | Resultado |
|---|---|---|
| 1 | `check-network-literals.sh` | **0 literales de red** (direcciones, localhost, http://, chainIds) |
| 2 | `check-contract-drift.sh` | ABIs y direcciones **sincronizadas con `rwa-sc`** |
| 3 | `pnpm -r typecheck` | **0 errores** en 6 paquetes (`config`, `shared`, `ui`, 3 apps) |
| 4 | `pnpm -r lint` | **0 errores** (warnings de deuda declarada: React Compiler, `any`, imports sin uso) |
| 5 | `pnpm -r build` | **3/3 builds** de producción con `output: standalone` |
| 6 | `pnpm a11y:o5` + `pnpm perf:o5` + `pnpm headers:o5` | 7/7 rutas con **0 violaciones axe críticas/graves** · 7/7 rutas **≤ 400 KB** gzip · **6 cabeceras presentes** en las 3 apps |
| 7 | `pnpm -r test` | **55 tests** en 9 suites · cobertura de módulos críticos **96,8 % líneas / 96,77 % funciones / 86,23 % branches** |

### Cobertura (umbral en CI: líneas/statements/funciones ≥ 90 %, branches ≥ 60 %)

```
All files          | 96.8  | 86.23 | 96.77 | 96.8
 api               | 94.83 | 76.36 | 90.9  | 94.83
 claims            | 97.43 | 92.30 | 100   | 97.43
 media             | 96.74 | 94.11 | 100   | 96.74
 security          | 100   | 100   | 100   | 100
 validation        | 97.87 | 33.33 | 100   | 97.87
```

La sesión SIWE con BD (`auth/index.ts` + `auth/routes.ts`) no entra en la cobertura
unitaria: se verifica con `scripts/test_auth_o1.sh` (**30/30**) y los E2E de revisión.

### Accesibilidad y rendimiento (build de producción)

| Ruta | First Load JS (gzip) |
|---|---|
| identity `/app` | 367.6 KB |
| identity `/` | 288.8 KB |
| issuer `/dashboard` | 302.7 KB |
| issuer `/` | 301.9 KB |
| token `/factory` | 309.3 KB |
| token `/` | 289.5 KB |
| token `/marketplace` | 304.9 KB |

axe-core (WCAG 2.0/2.1 A+AA) sobre las 7 páginas prerenderizadas: **0 críticas/graves**.
Se corrigió un `button-name` crítico en los menús móviles de los 3 headers.

## 2. Criterios de salida

| Criterio | Estado | Evidencia |
|---|---|---|
| **B-1** mutaciones con sesión y firma de issuer | ✅ | `scripts/test_auth_o1.sh` 30/30 · `scripts/test_review_o1.sh` 5/5 |
| **B-2** sin PII pública; `test-*` ausentes en producción | ✅ | rutas con `requireSession`/`requireOwner`; debug endpoints condicionados a `ALLOW_DEBUG_ENDPOINTS` |
| **B-3** ABIs/direcciones de artefactos + E2E | ✅ | gate de deriva en verde; **E2E completo contra el Anvil de GCP en verde** (`test_e2e_o2.sh`, 2026-10-23) |
| **B-4** repo + CI lint/tsc/build/tests | ✅ | `.gitlab-ci.yml` + `scripts/ci_local.sh`; rama publicada en GitLab/GitHub |
| **B-5** versiones únicas y tsc en verde | ✅ | next 16.1.6 · react 19.2.3 · 0 errores TS |
| **B-6** errores tipados sin `error.message` de librería | ✅ | `toErrorResponse` + `AppError`; tests de rutas |
| **C-1** `packages/shared` y 0 duplicados | ✅ | `shared` + `ui` + `config`; `RequestDetailModal` unificado |
| **C-2** entorno reproducible + imagen por app con healthcheck | 🟡 | `docker-compose.yml` + `Dockerfile` multi-stage listos; **`docker compose up` pendiente de host con Docker** |
| **C-3** 0 `console.*` y logger estructurado | ✅ | `no-console: error`; 0 usos en apps |
| **C-4** README real y 0 plantillas duplicadas | ✅ | README reescrito; scripts y mapa de apps actualizados |
| **C-5** RNF medidos en CI (AA, rendimiento, cobertura) | ✅ | gates `a11y:o5`, `perf:o5`, `headers:o5` y cobertura en `test` |

## 3. Pendiente para el cierre definitivo

1. **O5.1/O5.2**: ejecutar `docker compose up` y el build real de imágenes en un host con Docker
   (el entorno de desarrollo no tiene runtime de contenedores).
2. **R-9**: revisión independiente externa antes de declarar apto para producción.
3. **Fase 5 (manuales)**: omitible por D-087; decisión documentada en el informe de cierre.

*O2.7 y las brechas de requisitos se cerraron el 2026-10-23 (ver `o2_7_e2e_anvil.md` y
`o4_consolidacion.md`, rondas 23–24).*

---

## Ejecución de la Fase 4 (registro)

```
$ ./scripts/ci_local.sh
✓ Gate de literales de red
✓ Gate de deriva de ABIs
✓ TypeScript (6 paquetes)
✓ ESLint (0 errores)
✓ Build ×3
✓ Accesibilidad estática (7/7, 0 críticas/graves)
✓ Presupuesto de rendimiento (7/7 ≤ 400 KB)
✓ Validación estática de Docker (58/58)
✓ Cabeceras de seguridad y x-request-id (3 apps × 2 rutas)
✓ Tests 55/55 · cobertura 96,8 % líneas / 96,77 % funciones / 86,23 % branches
```

*Fin de la Fase 4 — 2026-10-19 · actualizado 2026-10-23*
