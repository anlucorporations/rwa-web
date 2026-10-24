# 📌 Estado de la etapa `@web` — Optimización del frontend RWA

> **Directivo:** Asistente de Proyecto (`@asistenteProyecto`)
> **Línea:** `@web` (`rwa-web/`) — separada de `@sc` (`rwa-sc/`) por D-102
> **Versión:** v3.1 · 2026-10-23 · **Fases 3 y 4 cerradas — O0, O1, O3 y O4 cerrados; O2 cerrado (incluye O2.7 tras redespliegue en GCP); O5 cerrado salvo O5.1/O5.2 (Docker, pendiente de host); brechas RNF-W-01/RF-W-05/RF-W-16 cerradas; R-9 externo y sin manuales (D-087)**
>
> **Memoria de trabajo de la etapa.** El registro global del proyecto (contratos + etapa web)
> sigue en `rwa-sc/RepoTecnico/estado_proyecto.md`; este archivo gobierna el día a día de `@web`.

---

## 1. Fases de la etapa `@web`

| Fase | Nombre | Estado | Base documental |
|---|---|---|---|
| 1 | Concepto | ✅ **Heredada** | `requerimientos_web.md` v1.2 (RF-W/RNF-W/RT-W) |
| 2 | Auditoría | ✅ **Heredada** | `INFORME_OPTIMIZACION_WEB_V1.md` (16 hallazgos, 15/15 verificados) |
| 3 | Desarrollo | ✅ **Cerrada (código y CI)** — O0–O4 cerrados; O5 casi completo | `plan_desarrollo_web.md` · `informe_optimizacion_web_cierre.md` |
| 4 | Pruebas | ✅ **Hecha** — gate CI 7 pasos, cobertura 97.16 % crítica, axe AA, perf budget | `pruebas/fase4_verificacion.md` |
| 5 | Manuales | ⏭️ **Omitida** por D-087 (decisión registrada en el informe de cierre) | `informe_optimizacion_web_cierre.md` |

**Decisión de arranque (2026-10-14, bloque 1 de la etapa):**
(a) ejecutar **O0 completo** con un commit y un gate por tarea;
(b) **monorepo mínimo ya** (`pnpm-workspace.yaml` + `packages/shared`) sin mover las apps;
(c) ejecutar con la documentación existente y esta memoria de etapa, sin generar Fase 1/2 nuevas.

---

## 2. Preparación verificada (2026-10-14)

| Comprobación | Comando | Resultado |
|---|---|---|
| Sincronía de artefactos de datos | `bash RepoTecnico/check_sincronizacion_datos.sh --check` | ✅ **exit 0** — 3/3 idénticos |
| Anvil de GCP | `source scripts/gcp-env.sh --tcp` | ✅ `chainId 0x7a69` (31337) |
| Cloud SQL PostgreSQL | `source scripts/gcp-env.sh --tcp` | ✅ esquema `rwa` con **10 tablas** |
| Toolchain | `node -v`, `pnpm -v` | node v22.23.2 · npm 10.9.8 · **pnpm 9.15.9** · jq 1.7 |
| Repositorio | `git status`, `git branch` | rama `rwa-web-DSH` · árbol limpio · **sin remoto** |
| Dependencias | `ls */node_modules` | ❌ **0/5 apps instaladas** (bloqueaba lint/tsc/build/test) |

---

## 3. Tablero del ciclo O0 — Fundación (D-100)

**Objetivo:** que el frontend arranque sobre la arquitectura decidida (PostgreSQL + Anvil de GCP)
antes de endurecer nada.

| # | Tarea | Estado | Evidencia / gate |
|---|---|---|---|
| O0.1 | Esquema `rwa` aplicado en Cloud SQL | ✅ HECHO | `pruebas/verificacion_gcp_o0.md` |
| O0.1b | Monorepo mínimo (`pnpm-workspace.yaml` + `packages/shared`) | ✅ HECHO | `pruebas/o0_1b_monorepo.md` |
| O0.2 | Capa de datos PostgreSQL en `packages/shared` (pool + repositorios) | ✅ HECHO | `pruebas/o0_2_capa_datos.md` |
| O0.3 | Sustituir MongoDB en las 3 apps (3 `lib/mongodb.ts`, 18 refs) | ✅ HECHO | `pruebas/o0_3_migracion_postgres.md` — 0 refs Mongo, 3 builds verdes |
| O0.4 | Arranque limpio: esquema vacío + catálogo de topics (sin ETL) | ✅ HECHO | 5 topics · resto de tablas a 0 |
| O0.5 | Configuración única de red → Anvil de GCP (chain 31337) | ✅ HECHO — validada y consumida por `/api/health` en las 3 apps; literales de cliente → O2.5/O2.6 | `packages/shared/src/config/*` · `app/api/health` |
| O0.6 | Consumir `.env.example`/`gcp-env.sh` y verificar 0 secretos en el árbol | ✅ HECHO | 0 secretos · `.env.local` ignorado |
| O0.7 | Prueba de humo: `SELECT 1` + `claim_topics` + `chainId` + rutas de app | ✅ HECHO | `scripts/smoke_o0.sh` 3/3 · `scripts/smoke_app_o0.sh` 6/6 |

**Entregable:** aplicación leyendo y escribiendo en PostgreSQL y contra el Anvil de GCP.
**Gate del ciclo:** `\dt rwa.*` = 10 tablas + 1 vista · 5 topics sembrados · `cast chain-id` = 31337 ·
smoke test en verde.

---

## 3b. Tablero del ciclo O1 — Contención de seguridad (D-092)

**Objetivo:** ninguna ruta muta estado ni entrega PII sin sesión autorizada.

| # | Tarea | Estado | Evidencia / gate |
|---|---|---|---|
| O1.0 | Sesión SIWE (EIP-4361) + cookie `httpOnly` firmada + `/api/auth/*` | ✅ HECHO | flujo real con `cast`; replay de nonce → 401 |
| O1.1 | Retirar/condicionar `/api/test-*` (RF-W-07) | ✅ HECHO — **endpoints retirados del árbol** (O5, ronda 20); 404 siempre | smoke `test-*` → 404 · `smoke_app_o0.sh` 6/6 |
| O1.2 | Firma + autorización del emisor e idempotencia en `update-request` (HW-01) | ✅ HECHO | `scripts/test_review_o1.sh` 5/5 (403 tercero/firma ajena, 200 emisor, 409 reintento) |
| O1.3 | Autenticar/autorizar `GET`/`POST` de claim-requests (HW-02/HW-04) | ✅ HECHO | anónimo 401 · otra dirección 403 |
| O1.4 | Descarga por propiedad + `attachment`+`nosniff` + magic bytes + `audit_log` | ✅ HECHO | descarga anónima 401; cabeceras saneadas |
| O1.5 | Proteger escrituras de `issuers` y `tokens` (HW-04/RF-W-12) | ✅ HECHO | anónimo 401; admin del token exigido |
| O1.6 | Errores tipados 401/403/503 sin `error.message` de librería | ✅ HECHO | `UnauthorizedError`/`ForbiddenError` + `toErrorResponse` |
| O1.7 | Suite de tests de rechazo anónimo por ruta | ✅ HECHO | `scripts/test_auth_o1.sh` **30/30** |

**Entregable:** 0 rutas mutan estado o entregan PII sin sesión válida y autorización por propiedad.
**Gate del ciclo:** suite de autorización en verde (una prueba negativa por ruta) + `GET /api/test-gridfs` → 404. **Cumplido.**

---

## 3c. Tablero del ciclo O2 — Sincronización con los contratos

**Objetivo:** que el flujo identidad → claim → aprobación → `isVerified` funcione contra los contratos
actuales en el Anvil de GCP (chain 31337).

| # | Tarea | Estado | Evidencia / gate |
|---|---|---|---|
| O2.1 | Módulo único de red y direcciones desde `sc/deployments/*.json` | ✅ HECHO | `scripts/sync-contracts.sh` · `check-contract-drift.sh` exit 0 |
| O2.2 | ABIs regenerados desde `sc/abis/`; eliminar copias inline | ✅ HECHO — 16 ABIs generados; las 3 copias inline de `web-identity` (json + `identity-claims.ts` + `RequestDetailModal.tsx`) y las del flujo de token sustituidas por los ABIs generados | `o2_1_contratos_generados.md`, `o2_2_red_unica.md`, `o2_3_claim_eip712.md`, `o2_4_token_factory.md` |
| O2.3 | `addClaim` de 7 args + firma **EIP-712** (con `uriHash`, D-083) | ✅ HECHO | `o2_3_claim_eip712.md` — esquema v1.1, API + 2 UIs, `test_review_o1.sh` 5/5 con firma EIP-712 |
| O2.4 | `claimTopicsRegistry` obligatorio + compliance al crear token | ✅ HECHO | `o2_4_token_factory.md` — 7 args reales, registry por token con topics, API fail-closed |
| O2.5 | `chainId` de la wallet vs canónico en la UI | ✅ HECHO | `assertCanonicalChain` en identidad y token |
| O2.6 | Gates `check-abi-drift` y `check-network-literals` | ✅ HECHO | **0 literales de red** · deriva 0 |
| O2.7 | E2E del flujo completo contra el Anvil de GCP | ✅ **HECHO (2026-10-23)** — stack canónico redesplegado (`31337-20261023T185622Z.json`, `CLAIM_TYPEHASH` con `uriHash`), ABIs sincronizadas y E2E en verde contra el Anvil de GCP (identidad → EIP-712 → `addClaim` → `hasValidClaim` → `isVerified`) | `o2_7_e2e_anvil.md` |

**Gate del ciclo:** E2E en verde + gates de deriva y literales en verde. **Cumplido** (O2.7 cerrado
tras el redespliegue del 2026-10-23).

> **Estado de O2.7:** cerrado. El Anvil de GCP ya ejecuta el build actual
> (`CLAIM_TYPEHASH = 0x65c6…` con `uriHash`) y el E2E completo pasa contra él. Detalle y salida real
> en `pruebas/o2_7_e2e_anvil.md`; nota sobre el falso negativo de `deploy.sh` con Foundry 1.8.3 incluida allí.

---

## 3d. Tablero del ciclo O3 — Verificabilidad

**Objetivo:** poder verificar cualquier cambio futuro (repo + CI + versiones + tipos).

| # | Tarea | Estado | Evidencia / gate |
|---|---|---|---|
| O3.1 | Repositorio `rwa-web`, `.gitignore` y `.env.example` por app | ✅ HECHO | `.env.example` raíz + uno por app |
| O3.2 | `.env` fuera del árbol (`git check-ignore`) | ✅ HECHO | `.env`/`.env.local` ignorados; 0 versionados |
| O3.3 | Versión única de `next`/`react` por workspace | ✅ HECHO | **next 16.1.6 · react 19.2.3** · un `pnpm-lock.yaml` |
| O3.4 | Retirar `ignoreBuildErrors` y saldar tipos | ✅ HECHO | **0 errores tsc** en las 3 apps; builds con type-check |
| O3.5 | CI con lint/tsc/build/test/gates + runner local | ✅ HECHO | `.gitlab-ci.yml` · `scripts/ci_local.sh` **exit 0** |
| O3.6 | Tests: Vitest rutas críticas + E2E Playwright | ✅ **HECHO** — **42 tests Vitest** con cobertura + **E2E Playwright del claim-flow** contra Anvil local (`e2e:local:o5`: identidad → claim → aprobación EIP-712 → `addClaim`) con wallet inyectada mock | `scripts/e2e_claim_o5.mjs` · `scripts/e2e_local_o5.sh` |
| O3.7 | Logger estructurado, 0 `console.*` | ✅ HECHO | **224 eliminadas · 0 restantes** · `no-console: error` |

**Gate del ciclo:** `./scripts/ci_local.sh` en verde (literales · deriva · tsc · eslint · build ×3 · tests).
**Cumplido** (con O3.6 parcial declarado).

---

## 3e. Tablero del ciclo O4 — Consolidación en monorepo

**Objetivo:** 3 apps mantenibles sobre una base compartida.

| # | Tarea | Estado | Evidencia / gate |
|---|---|---|---|
| O4.1 | Monorepo `apps/{identity,issuer,token}` + `packages/shared` | ✅ HECHO | `apps/*` con `@rwa/{identity,issuer,token}`; workspace `packages/* + apps/*` |
| O4.2 | `packages/shared` completo (red, ABIs, tipos, datos, cliente API, `zod`, logger) | ✅ **HECHO** — `packages/{shared,ui,config}` operativos; `@rwa/ui` y `@rwa/config` consumidos por las apps | `o4_consolidacion.md` |
| O4.3 | Eliminar duplicados | ✅ **HECHO** — `RequestDetailModal` único en `@rwa/ui` (variantes investor/issuer); tipos y registries consolidados | `o4_consolidacion.md` |
| O4.4 | Destino de `web-registry-trusted2` | ✅ **Retirada** (duplicado experimental) | `o4_consolidacion.md` |
| O4.5 | Destino de `web-rwa` | ✅ **Retirada** (landing fuera del objetivo de 3 apps) | `o4_consolidacion.md` |
| O4.6 | Unificar web3 en `wagmi`+`viem`; 0 `window.ethereum` | ✅ **HECHO** — **0 `window.ethereum` y 0 imports de `ethers`** en todo el monorepo; `ethers` desinstalado de las 3 apps; stack único wagmi+viem | `o4_consolidacion.md` |
| O4.7 | Estado de datos con TanStack Query | ✅ **HECHO** — `useQuery`/`useMutation` + invalidación en las 3 apps (tokens, claim-requests, issuer-requests, trusted issuers, update-request) | `o4_consolidacion.md` |

**Gate del ciclo:** `pnpm -r build && pnpm -r test` en verde + conteo de duplicados = 0. **Cumplido** (6 paquetes typecheck/lint, build ×3, 35 tests).

---

## 3f. Tablero del ciclo O5 — Operación y calidad

| # | Tarea | Estado | Evidencia / gate |
|---|---|---|---|
| O5.1 | `docker-compose`: 3 apps + PostgreSQL + Anvil con healthchecks | 🟡 **Validado estáticamente 58/58** (esquema oficial compose-spec + semántica + artefactos), en CI; `docker compose up` pendiente de host con Docker | `scripts/docker_validate_o5.mjs` · rondas 12/17/19 |
| O5.2 | Imágenes multi-stage `standalone`, `PORT` y healthcheck | 🟡 **Dockerfile validado estáticamente** (stages/COPY/healthcheck/CMD/no-root) y artefactos standalone comprobados; build real pendiente de host con Docker | `Dockerfile` · `scripts/docker_validate_o5.mjs` |
| O5.3 | Retirar `docker-build/` y rutas de desarrollador | ✅ HECHO — sin `docker-build/`; scripts `start/stop/check` actualizados al monorepo | `o4_consolidacion.md` |
| O5.4 | Cifrado AES-256-GCM de documentos KYC + `audit_log` | ✅ **HECHO** — cifrado en subida, descifrado tras autorización, `audit_log` en acceso; 7 tests nuevos | `o4_consolidacion.md` (ronda 13) |
| O5.5 | Índices, retención de `sessions`/`audit_log` y backup/restore | ✅ **HECHO y ejecutado** en Cloud SQL: `retention_o5.mjs --dry-run`/real y `backup_o5.mjs` + restauración simulada (ROLLBACK) | `scripts/` |
| O5.6 | Accesibilidad (`axe`) y estados/notificaciones unificados | ✅ **HECHO** — gate estático + auditoría en navegador real (7/7 rutas, 0 críticas/graves) y **`ToastProvider` unificado** (0 `alert()`) | `scripts/a11y_o5.mjs` · `scripts/a11y_browser_o5.mjs` · `packages/ui/src/Toast.tsx` |
| O5.7 | Presupuesto de rendimiento medido en build de producción | ✅ **HECHO** — First Load JS gzip por ruta (máx. 367.6 KB) con presupuesto 400 KB en CI | `scripts/perf_budget_o5.mjs` |
| O5.8 | README raíz con el mapa real de apps y puertos | ✅ HECHO — README reescrito con arranque local y Docker | `README.md` |

---

## 3g. Cierre de brechas y operación (2026-10-23)

| # | Tarea | Estado | Evidencia |
|---|---|---|---|
| R-23.1 | Push de los commits pendientes a GitLab y GitHub; pipeline remoto | ✅ HECHO | `git ls-remote` → `bd00aff` en ambos remotos; pipeline GitLab #4729 |
| R-23.2 | Secretos `SIWE_SESSION_SECRET` y `KYC_ENCRYPTION_KEY` en Secret Manager | ✅ HECHO | `gcloud secrets list` (proyecto `truekeate-main`); `gcp-env.sh` los exporta |
| R-23.3 | Cabeceras `CSP`/`X-Frame-Options`/`Referrer-Policy`/`HSTS` en las 3 apps | ✅ HECHO | `next.config.ts` ×3 · `scripts/headers_o5.mjs` |
| R-23.4 | Rate limit + cuota por wallet en subidas KYC | ✅ HECHO | `packages/shared/src/security/upload-limits.ts` · `upload/route.ts` · 9 tests |
| R-23.5 | `error.tsx`/`loading.tsx` por app y `requestId` correlado | ✅ HECHO | `packages/ui/src/States.tsx` · `apps/*/middleware.ts` · `toErrorResponse` |
| R-23.6 | Presupuesto de rendimiento fijado en 400 KB (D-104) | ✅ HECHO | `requerimientos_web.md` RNF-W-06 |
| R-23.7 | Redespliegue del stack canónico en el Anvil de GCP + sincronización | ✅ HECHO | `31337-20261023T185622Z.json` · `CLAIM_TYPEHASH=0x65c6…` · deriva 0 |
| R-23.8 | O2.7 E2E contra el Anvil de GCP | ✅ HECHO | `pruebas/o2_7_e2e_anvil.md` |
| R-23.9 | `registerIdentity` onlyOwner documentado como limitación (D-105) | ✅ HECHO | `pruebas/o4_consolidacion.md` ronda 22 |
| R-23.10 | O5.1/O5.2 · validación real de Docker | 🟡 PENDIENTE DE HOST | Sin runtime de contenedores en el entorno; validación estática 58/58 |
| R-23.11 | R-9 · auditoría independiente | ⏭️ EXTERNA | `informe_optimizacion_web_cierre.md` |

---

## 4. Decisiones de la etapa (D-088…D-105)

Vigentes y aplicables a `@web`; el detalle está en `requerimientos_web.md` §1 y en el estado global:

- **D-088** alcance solo frontend · **D-089** hardening + monorepo · **D-090/D-100** orden O0→O5.
- **D-091/D-096** red canónica = **Anvil de GCP** (chain 31337) · **D-092** sesión SIWE.
- **D-093/D-095/D-098** KYC cifrado AES-256-GCM en `rwa.document_files` (PostgreSQL, no GridFS).
- **D-094** repo `rwa-web` (sin `push` sin orden) · **D-097/D-101** Cloud SQL `truekeate-db-dev`.
- **D-099** arranque limpio sin ETL · **D-102** separación de líneas y espejo de artefactos.
- **D-103** cabeceras de seguridad + límites de subida (tamaño/tasa/cuota) · **D-104** presupuesto 400 KB.
- **D-105** `registerIdentity` onlyOwner se documenta como limitación; el alta la hace el admin.

**Regla de datos:** `base_datos.sql`, `diccionario_datos.md` y `diagrama_er.md` se editan juntos y
los espejos deben ser idénticos byte a byte (gate `check_sincronizacion_datos.sh --check`).

---

## 5. Reglas de ejecución

1. Un ciclo/tarea = una entrega operativa; nada se declara hecho sin comando reproducible.
2. Commit por tarea `O0.<n>: <objetivo>` con el gate en el cuerpo. **Sin `push` sin orden explícita.**
3. No se toca `rwa-sc` salvo lectura de `sc/abis/` y `sc/deployments/`. Excepción: el redespliegue de
   O2.7 (2026-10-23) se ejecutó con autorización expresa y solo añadió un artefacto nuevo en `sc/deployments/`.
4. Los 3 artefactos de datos no se modifican salvo que cambie el modelo, y entonces se actualizan juntos.
5. Evidencia de cada tarea en `RepoTecnico/pruebas/`.

---

## 6. Próximo paso

✅ **Ciclos O0–O5 cerrados.** O2.7 se cerró el 2026-10-23 tras redesplegar el stack canónico en el
Anvil de GCP (artefacto `31337-20261023T185622Z.json`, `CLAIM_TYPEHASH` con `uriHash`) y ejecutar el
E2E completo. O5.1/O5.2 solo quedan pendientes de un host con Docker (validación estática 58/58 en CI).

**Cerrado en la ronda del 2026-10-23:**

- Brechas de requisitos: cabeceras de seguridad (RNF-W-01), rate limit + cuota por wallet (RF-W-05),
  `error.tsx`/`loading.tsx` y `requestId` correlado (RF-W-16/RT-W-10), presupuesto 400 KB (D-104).
- Secretos `SIWE_SESSION_SECRET` y `KYC_ENCRYPTION_KEY` creados en Secret Manager.
- Commits publicados en GitLab y GitHub (pipeline #4729).
- `registerIdentity` onlyOwner documentado como limitación (D-105).

**Pendiente para producción (no bloquea el cierre de la etapa):**

1. **O5.1/O5.2:** `docker compose up` y build de imágenes en un host con Docker.
2. **R-9:** auditoría independiente externa.
3. **Fuera de `@web`:** aprobación legal (H-10/H-11/H-25), indexer off-chain (H-12/H-21) y
   adopción/auditoría del multisig (H-06/R-7) desde la línea `@sc`.
4. **Fase 5 (manuales):** omitida por D-087.

---

*Fin del documento — estado_proyecto.md (etapa `@web`) v2.0*
