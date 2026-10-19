# 📌 Estado de la etapa `@web` — Optimización del frontend RWA

> **Directivo:** Asistente de Proyecto (`@asistenteProyecto`)
> **Línea:** `@web` (`rwa-web/`) — separada de `@sc` (`rwa-sc/`) por D-102
> **Versión:** v2.7 · 2026-10-19 · **Fases 3 y 4 cerradas — O0, O1, O3, O4 cerrados; O5 casi completo (O5.1/O5.2/O5.5 pendientes de Docker/PostgreSQL reales); O2.7 bloqueado por GCP**
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
| O1.1 | Retirar/condicionar `/api/test-*` (RF-W-07) | ✅ HECHO | 404 sin `ALLOW_DEBUG_ENDPOINTS=1` |
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
| O2.7 | E2E del flujo completo contra el Anvil de GCP | ✅ **E2E en verde con el build final** (Anvil temporal: identidad → EIP-712 → `addClaim` → `hasValidClaim` → `isVerified`) · ⛔ el **Anvil de GCP** sigue con un build anterior a D-083 y exige redespliegue desde `@sc` (fuera de D-088) | `o2_7_e2e_anvil.md` |

**Gate del ciclo:** E2E en verde + gates de deriva y literales en verde. *(Deriva y literales en verde;
el E2E off-chain está en verde, pero el on-chain está bloqueado por el despliegue.)*

> **Estado de O2.7:** el E2E completo se ejecutó **en verde contra un Anvil con el build final**
> (despliegue efímero desde una copia temporal de `rwa-sc`, sin tocar el repo). El **Anvil de GCP**
> sigue con un build **anterior a D-083** (`CLAIM_TYPEHASH = 0x8f71…` sin `uriHash` frente a `0x65c6…`),
> por lo que allí `addClaim` revierte `"Signature signer mismatch"`. **Acción requerida (fuera de D-088):**
> redesplegar el stack canónico desde `@sc` (`sc/script/deploy.sh`), ejecutar `./scripts/sync-contracts.sh`
> y re-lanzar `./scripts/test_e2e_o2.sh` (ya toma el artefacto más reciente). Detalle en `pruebas/o2_7_e2e_anvil.md`.

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
| O3.6 | Tests: Vitest rutas críticas + E2E Playwright | 🟡 **Parcial** — **25 tests Vitest en verde**; el flujo claim→aprobación está cubierto por E2E con criptografía real (`test_review_o1.sh`, `test_e2e_o2.sh`); Playwright de navegador diferido a O5 (requiere automatización de wallet) | `pruebas/o3_verificabilidad.md` |
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
| O5.1 | `docker-compose`: 3 apps + PostgreSQL + Anvil con healthchecks | 🟡 **Assets listos** (`docker-compose.yml`, init SQL, perfil `chain`); `docker compose up` pendiente de validar en host con Docker | `o4_consolidacion.md` (ronda 12) |
| O5.2 | Imágenes multi-stage `standalone`, `PORT` y healthcheck | 🟡 **Dockerfile multi-stage** con healthcheck HTTP; build de imagen pendiente de host con Docker | `Dockerfile` |
| O5.3 | Retirar `docker-build/` y rutas de desarrollador | ✅ HECHO — sin `docker-build/`; scripts `start/stop/check` actualizados al monorepo | `o4_consolidacion.md` |
| O5.4 | Cifrado AES-256-GCM de documentos KYC + `audit_log` | ✅ **HECHO** — cifrado en subida, descifrado tras autorización, `audit_log` en acceso; 7 tests nuevos | `o4_consolidacion.md` (ronda 13) |
| O5.5 | Índices, retención de `sessions`/`audit_log` y backup/restore | 🟡 **Scripts listos** (`retention_o5.sh`, `backup_o5.sh`); ejecución pendiente de PostgreSQL/`psql` | `scripts/` |
| O5.6 | Accesibilidad (`axe`) y estados/notificaciones unificados | ✅ **Gate estático axe-core** en CI (7/7 rutas, 0 críticas/graves); auditoría de navegador pendiente | `scripts/a11y_o5.mjs` |
| O5.7 | Presupuesto de rendimiento medido en build de producción | ✅ **HECHO** — First Load JS gzip por ruta (máx. 367.6 KB) con presupuesto 400 KB en CI | `scripts/perf_budget_o5.mjs` |
| O5.8 | README raíz con el mapa real de apps y puertos | ✅ HECHO — README reescrito con arranque local y Docker | `README.md` |

---

## 4. Decisiones de la etapa (D-088…D-102)

Vigentes y aplicables a `@web`; el detalle está en `requerimientos_web.md` §1 y en el estado global:

- **D-088** alcance solo frontend · **D-089** hardening + monorepo · **D-090/D-100** orden O0→O5.
- **D-091/D-096** red canónica = **Anvil de GCP** (chain 31337) · **D-092** sesión SIWE.
- **D-093/D-095/D-098** KYC cifrado AES-256-GCM en `rwa.document_files` (PostgreSQL, no GridFS).
- **D-094** repo `rwa-web` (sin `push` sin orden) · **D-097/D-101** Cloud SQL `truekeate-db-dev`.
- **D-099** arranque limpio sin ETL · **D-102** separación de líneas y espejo de artefactos.

**Regla de datos:** `base_datos.sql`, `diccionario_datos.md` y `diagrama_er.md` se editan juntos y
los espejos deben ser idénticos byte a byte (gate `check_sincronizacion_datos.sh --check`).

---

## 5. Reglas de ejecución

1. Un ciclo/tarea = una entrega operativa; nada se declara hecho sin comando reproducible.
2. Commit por tarea `O0.<n>: <objetivo>` con el gate en el cuerpo. **Sin `push` sin orden explícita.**
3. No se toca `rwa-sc` salvo lectura de `sc/abis/` y `sc/deployments/`.
4. Los 3 artefactos de datos no se modifican salvo que cambie el modelo, y entonces se actualizan juntos.
5. Evidencia de cada tarea en `RepoTecnico/pruebas/`.

---

## 6. Próximo paso

✅ **Ciclos O0 y O1 cerrados.**

- **O0 — Fundación:** 3 apps sobre PostgreSQL y contra el Anvil de GCP; 0 referencias a MongoDB;
  esquema con 10 tablas + 1 vista y 5 topics; `smoke_app_o0.sh` 6/6. Evidencias en `pruebas/o0_*.md`.
- **O1 — Contención de seguridad:** sesión SIWE con cookie firmada, autorización por propiedad y firma
  en las 16 rutas, `test-*` → 404, magic bytes, `attachment`+`nosniff`, `audit_log` y errores 401/403/503.
  Evidencia: `pruebas/o1_contencion_seguridad.md` · gates `scripts/test_auth_o1.sh` **30/30** y
  `scripts/test_review_o1.sh` **5/5**.

**Gate de cierre de O1 verificado:** suite de autorización en verde (una prueba negativa por ruta) y
`GET /api/test-gridfs` → 404. HW-01, HW-02, HW-04 y HW-08 cubiertos.

**Siguiente ciclo: O2 — Sincronización con los contratos** (en curso).

- ✅ **O2.1** módulo de contratos generado desde `rwa-sc` (16 ABIs + direcciones) con gate de deriva.
- ✅ **O2.2 (parcial)** red única client-safe; **0 literales de red** en el código.
- ✅ **O2.5** `assertCanonicalChain` bloquea la operación si la wallet no está en chain 31337.
- ✅ **O2.6** gates `check-contract-drift` y `check-network-literals` en verde.
- ⏳ **O2.3** `addClaim` de 7 args + firma EIP-712 (dominio `RWA-Identity`/`1`/31337/`<clon>`,
  `Claim(walletOwner,topic,scheme,dataHash,expiresAt,nonce,uriHash)`): exige persistir el payload
  firmado (columnas nuevas en `rwa.claim_requests`) y cambiar la firma del emisor de EIP-191 a
  `signTypedData` — es la causa raíz de que el flujo no funcione on-chain.
- ⏳ **O2.4** crear token con los **7** argumentos reales y `claimTopicsRegistry` no nulo
  (`createRegistryForTokenWithTopics`).
- ⏳ **O2.7** E2E contra el Anvil de GCP.
- Pendiente operativo: **crear `SIWE_SESSION_SECRET` en Secret Manager** (hoy solo en `.env.local`).

---

*Fin del documento — estado_proyecto.md (etapa `@web`) v2.0*
