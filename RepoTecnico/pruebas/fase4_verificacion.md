# Fase 4 — Verificación de la etapa `@web`

> **Fecha:** 2026-10-19 · **Línea:** `rwa-web` (`@web`) · **Alcance:** 3 apps + 3 paquetes.
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
| 6 | `pnpm a11y:o5` + `pnpm perf:o5` | 7/7 rutas con **0 violaciones axe críticas/graves** · 7/7 rutas **≤ 400 KB** gzip First Load JS |
| 7 | `pnpm -r test` | **42 tests** en 7 suites · cobertura de módulos críticos **97.16 % líneas / 100 % funciones** |

### Cobertura (umbral en CI: líneas/statements/funciones ≥ 90 %, branches ≥ 60 %)

```
All files        | 97.16 | 84.21 | 100 | 97.16
 api             | 96.87 | 74.46 | 100 | 96.87
 claims          | 97.43 | 92.30 | 100 | 97.43
 media           | 96.74 | 94.11 | 100 | 96.74
 validation      | 97.87 | 33.33 | 100 | 97.87
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
| **B-3** ABIs/direcciones de artefactos + E2E | 🟡 | gate de deriva en verde; E2E off-chain en verde; **E2E contra Anvil de GCP pendiente de redespliegue desde `@sc`** (O2.7) |
| **B-4** repo + CI lint/tsc/build/tests | ✅ | `.gitlab-ci.yml` + `scripts/ci_local.sh`; rama publicada en GitLab/GitHub |
| **B-5** versiones únicas y tsc en verde | ✅ | next 16.1.6 · react 19.2.3 · 0 errores TS |
| **B-6** errores tipados sin `error.message` de librería | ✅ | `toErrorResponse` + `AppError`; tests de rutas |
| **C-1** `packages/shared` y 0 duplicados | ✅ | `shared` + `ui` + `config`; `RequestDetailModal` unificado |
| **C-2** entorno reproducible + imagen por app con healthcheck | 🟡 | `docker-compose.yml` + `Dockerfile` multi-stage listos; **`docker compose up` pendiente de host con Docker** |
| **C-3** 0 `console.*` y logger estructurado | ✅ | `no-console: error`; 0 usos en apps |
| **C-4** README real y 0 plantillas duplicadas | ✅ | README reescrito; scripts y mapa de apps actualizados |
| **C-5** RNF medidos en CI (AA, rendimiento, cobertura) | ✅ | gates `a11y:o5`, `perf:o5`, cobertura en `test` |

## 3. Pendiente para el cierre definitivo

1. **O2.7**: redesplegar el stack canónico en el Anvil de GCP desde `@sc` (fuera de D-088) y
   relanzar `scripts/test_e2e_o2.sh`.
2. **O5.1/O5.2/O5.5**: ejecutar `docker compose up` y retención/backup en un host con Docker y
   PostgreSQL real (el entorno de desarrollo no los tiene).
3. **O5.6**: auditoría de navegador (foco/estados dinámicos/lectores de pantalla) — la estática
   axe ya está en CI.
4. **R-9**: revisión independiente externa antes de declarar apto para producción.
5. **Fase 5 (manuales)**: omitible por D-087; decisión documentada en el informe de cierre.

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
✓ Tests 42/42 · cobertura 97.16 % líneas / 100 % funciones / 84.21 % branches
```

*Fin de la Fase 4 — 2026-10-19*
