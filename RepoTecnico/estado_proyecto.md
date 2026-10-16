# 📌 Estado de la etapa `@web` — Optimización del frontend RWA

> **Directivo:** Asistente de Proyecto (`@asistenteProyecto`)
> **Línea:** `@web` (`rwa-web/`) — separada de `@sc` (`rwa-sc/`) por D-102
> **Versión:** v1.0 · 2026-10-14 · **Fase 3 (Desarrollo) en curso — ciclo O0**
>
> **Memoria de trabajo de la etapa.** El registro global del proyecto (contratos + etapa web)
> sigue en `rwa-sc/RepoTecnico/estado_proyecto.md`; este archivo gobierna el día a día de `@web`.

---

## 1. Fases de la etapa `@web`

| Fase | Nombre | Estado | Base documental |
|---|---|---|---|
| 1 | Concepto | ✅ **Heredada** | `requerimientos_web.md` v1.2 (RF-W/RNF-W/RT-W) |
| 2 | Auditoría | ✅ **Heredada** | `INFORME_OPTIMIZACION_WEB_V1.md` (16 hallazgos, 15/15 verificados) |
| 3 | Desarrollo | 🟡 **EN CURSO — ciclo O0** | `plan_desarrollo_web.md` v1.2 (ciclos O0…O5) |
| 4 | Pruebas | ⏳ Pendiente | — |
| 5 | Manuales | ⏳ Pendiente (omitible por D-087 de `@sc`) | — |

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
| O0.3 | Sustituir MongoDB en las 3 apps (3 `lib/mongodb.ts`, 18 refs) | 🟡 EN CURSO | 0 referencias `mongodb` en rutas |
| O0.4 | Arranque limpio: esquema vacío + catálogo de topics (sin ETL) | ⏳ | `select count(*) from rwa.claim_topics` = 5 |
| O0.5 | Configuración única de red → Anvil de GCP (chain 31337) | 🟡 `packages/shared/config` hecho; falta consumirlo en las apps | 0 literales de red en fuente |
| O0.6 | Consumir `.env.example`/`gcp-env.sh` y verificar 0 secretos en el árbol | ⏳ | `git ls-files` sin secretos |
| O0.7 | Prueba de humo: `SELECT 1` + `claim_topics` + `chainId` | 🟡 script `scripts/smoke_o0.sh` → 3/3 verde; falta la ruta de app | `pruebas/o0_2_capa_datos.md` §2 |

**Entregable:** aplicación leyendo y escribiendo en PostgreSQL y contra el Anvil de GCP.
**Gate del ciclo:** `\dt rwa.*` = 10 tablas + 1 vista · 5 topics sembrados · `cast chain-id` = 31337 ·
smoke test en verde.

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

✅ **O0.1b** (monorepo + `pnpm install`) y **O0.2** (capa de datos PostgreSQL) completados con evidencia.

En curso: **O0.3** — sustituir los 3 `lib/mongodb.ts` y las 18 referencias a MongoDB por
`@rwa/shared` en las 19 manejadores de las 16 rutas, preservando el contrato JSON con los
serializadores. Incluye reordenar el flujo `upload → claim` (el documento se liga a la solicitud
por `claim_request_id`).

Después: **O0.4** (arranque limpio, sin ETL) · **O0.5** (config de red consumida en las apps) ·
**O0.6** (env/secretos) · **O0.7** (smoke test de app) y cierre del ciclo con su gate.

---

*Fin del documento — estado_proyecto.md (etapa `@web`) v1.0*
