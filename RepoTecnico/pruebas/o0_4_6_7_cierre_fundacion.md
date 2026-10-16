# Evidencia O0.4 · O0.5 · O0.6 · O0.7 — Cierre de la fundación (2026-10-14)

> **Tareas:** O0.4 (arranque limpio), O0.5 (red única), O0.6 (entorno y secretos), O0.7 (prueba de humo).
> **Decisiones:** D-096 (Anvil de GCP) · D-099 (sin ETL) · D-101 (conexión Cloud SQL) · D-095 (PostgreSQL).

## O0.4 — Arranque limpio (sin ETL)

```bash
psql "$CONN" -Atc "SELECT 'claim_topics', count(*) FROM rwa.claim_topics UNION ALL ..."
```

**Resultado real (Cloud SQL `truekeate-db-dev`, 2026-10-14):**

| Tabla | Filas |
|---|---|
| `claim_topics` | **5** (1 KYC ✓ · 7 ACCREDITATION ✓ · 9 JURISDICTION ✓ · 5 ENVIRONMENTAL ✗ · 6 SANCTIONS ✗) |
| `issuers` · `claim_requests` · `document_files` · `tokens` · `token_required_claims` · `token_compliance_modules` · `sessions` · `audit_log` | **0** |
| `schema_migrations` | **1** (`1.0`) |

✅ Esquema **vacío** salvo el catálogo de topics y la migración; **no se ejecutó ningún ETL**
(el Anexo A de `base_datos.sql` queda como migración opcional, D-099).

## O0.5 — Configuración única de red

- `packages/shared/src/config/index.ts`: `getNetworkConfig()` valida `chainId === 31337` (D-096) y
  `NEXT_PUBLIC_RPC_URL`; un `chainId` distinto lanza `ConfigError` en lugar de avisar.
- `packages/shared/src/config/deployment.ts`: `getContractAddress()` lee las direcciones del artefacto
  versionado `rwa-sc/sc/deployments/31337-20261010T162639Z.json` (RF-W-09), sin literales en el código.
- **Consumido hoy en servidor** por la creación de token (`web-token/app/api/tokens/route.ts`).
- **Deuda declarada:** los componentes cliente aún conservan literales de red heredados
  (`localhost:8545`, `0x…`); su eliminación es **O2.5/O2.6** (gates `check-network-literals`).

## O0.6 — Entorno y secretos

| Comprobación | Resultado real |
|---|---|
| `.env.example` versionado | ✅ raíz `rwa-web/.env.example` (+ `web-registry-trusted2/.env.example`) |
| `.env.local` fuera del índice | ✅ `git ls-files \| grep -c .env.local` = **0**; `git check-ignore -v .env.local` → `.gitignore:19` |
| Secretos reales en el árbol | ✅ **0** hallazgos (`BEGIN PRIVATE KEY`, `glpat-`, `ghp_`, `AKIA…`, `AIza…`) |
| Carga de entorno | ✅ `scripts/gcp-env.sh --tcp` obtiene `DATABASE_URL` de Secret Manager en tiempo de ejecución (no persiste) |
| Clave de test de Anvil | ⚠️ **Pública por diseño** (Anvil default) y presente en docs y en `web-registry-trusted/app/dashboard/page.tsx:350`; no es un secreto, pero sacarla del código es O2/O3 |

## O0.7 — Prueba de humo (2 niveles, ambas en verde)

**Nivel 1 — servicios (sin app):**
```bash
./scripts/smoke_o0.sh
# ✓ PostgreSQL SELECT 1 · ✓ rwa.claim_topics (activos): [1,7,9] · ✓ RPC chainId 0x7a69 = 31337
# 3/3 comprobaciones en verde
```

**Nivel 2 — aplicación (build de producción + HTTP real, O0.7):**
```bash
./scripts/smoke_app_o0.sh
```
**Resultado real (exit 0):**
```
✓ web-identity GET /api/claim-requests → HTTP 200 · {"success":true,"data":[],"count":0}
✓ web-identity GET /api/test-gridfs     → HTTP 200 · {"success":true,"totalFiles":0,...}
✓ web-token    GET /api/tokens          → HTTP 200 · {"success":true,"data":[],"count":0}
✓ web-token    GET /api/test-db         → HTTP 200 · {"success":true,"connected":true,"database":"rwa",...,"dbStats":{"tables":11,...}}
[smoke-app-o0] ✓ 4/4 rutas en verde sobre PostgreSQL
```
`dbStats.tables = 11` = 10 tablas + 1 vista del esquema `rwa`.

## Gate de cierre del ciclo O0

| Criterio (plan §O0) | Estado |
|---|---|
| `\dt rwa.*` = 10 tablas + 1 vista | ✅ (O0.1) |
| 5 topics sembrados | ✅ (O0.4) |
| `cast chain-id` = 31337 | ✅ (O0.7 nivel 1) |
| Smoke test en verde | ✅ (O0.7 niveles 1 y 2) |
| App sobre PostgreSQL (0 refs Mongo, 3 builds verdes) | ✅ (O0.3) |

**Deuda residual del ciclo (ninguna bloquea el cierre):** cifrado KYC (O5.4), autorización/PII (O1),
literales de red en cliente (O2.5/O2.6), `ignoreBuildErrors` (O3.4), `docker-build/` rastreado (O1/O3).

*Fin de la evidencia — cierre O0*
