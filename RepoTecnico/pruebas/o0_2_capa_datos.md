# Evidencia O0.2 — Capa de datos PostgreSQL en `packages/shared` (2026-10-14)

> **Tarea:** O0.2 (ciclo O0) — pool único, consultas parametrizadas y repositorios.
> **Requisito:** RT-W-07 · **Decisiones:** D-095 (PostgreSQL), D-098 (documentos `bytea`), D-099 (arranque limpio).
> **Insumo:** inventario Mongo→PostgreSQL de las 16 rutas (19 manejadores) y del esquema `rwa`.

## 1. API pública de `@rwa/shared`

| Módulo | Exporta |
|---|---|
| `@rwa/shared/config` | `getNetworkConfig()` (valida chain 31337, RF-W-08) · `getServerConfig()` (`DATABASE_URL`, `LOG_LEVEL`, `ALLOW_DEBUG_ENDPOINTS`) · `CANONICAL_CHAIN_ID` |
| `@rwa/shared/errors` | `AppError`, `ConfigError`, `ValidationError`, `NotFoundError`, `ConflictError`, `ServiceUnavailableError` (RF-W-13/RNF-W-04) |
| `@rwa/shared/logging` | `logger` (`pino`, RT-W-10) |
| `@rwa/shared/db` | `getPool`, `query`, `queryWith`, `withTransaction`, `ping`, `closePool` · `repos` (instancias) · clases de repositorio · tipos de fila |
| `@rwa/shared` (raíz) | serializadores `toClaimRequestDto`, `toTokenDto`, `toIssuerDto` (preservan el contrato JSON heredado) |

**Repositorios (uno por tabla):** `ClaimTopicsRepository` · `IssuersRepository` · `ClaimRequestsRepository` ·
`DocumentFilesRepository` · `TokensRepository` (+ `token_required_claims`, `token_compliance_modules`) ·
`SessionsRepository` · `AuditLogRepository`.

**Garantías de la capa:**
- Un **único `pg.Pool`** por proceso (singleton en `globalThis`), con `max` configurable por `PG_POOL_MAX`.
- **Todas** las consultas son parametrizadas; ninguna interpola datos de entrada.
- Las operaciones multi-tabla (`create` de token, `setRequiredClaims`, `setComplianceModules`) usan `withTransaction` (`BEGIN/COMMIT/ROLLBACK`).
- Un fallo de conexión se traduce a `ServiceUnavailableError` (503, RNF-W-04); las violaciones de restricción, a `ValidationError`/`ConflictError` (RF-W-13).
- Los `numeric`/`bigint` se tratan como `string` (sin `parseFloat`, punto 11 del inventario).

## 2. Gate reproducible

```bash
pnpm --filter @rwa/shared typecheck
```

**Resultado real:** `tsc --noEmit` → **exit 0** (18 ficheros `.ts`, `strict: true`).

```bash
./scripts/smoke_o0.sh          # source scripts/gcp-env.sh --tcp + pnpm --filter @rwa/shared smoke
```

**Resultado real (servicios de GCP, 2026-10-14):**

```
[gcp-env] ✓ Anvil de GCP responde: chainId 0x7a69 (31337)
[gcp-env] ✓ PostgreSQL en GCP (Cloud SQL truekeate-main:southamerica-east1:truekeate-db-dev) — esquema rwa: 10 tablas
— Prueba de humo O0 —
✓ PostgreSQL SELECT 1: ok
✓ rwa.claim_topics (activos): [1, 7, 9] 1=KYC · 7=ACCREDITATION · 9=JURISDICTION
✓ RPC chainId (https://mcc-foundry-anvil-1095249147821.europe-west1.run.app): 0x7a69 = 31337 (esperado 31337)
3/3 comprobaciones en verde  →  exit 0
```

Es decir: la capa compartida **lee el esquema real en Cloud SQL** y valida el **RPC canónico**, no solo compila.

## 3. Decisiones tomadas al implementar (heredadas del inventario)

| # | Punto | Decisión en O0 |
|---|---|---|
| 1 | ObjectId → uuid | Se acepta **uuid nativo**. Los serializadores exponen `_id = id` para no romper a la UI; la validación `ObjectId.isValid` se sustituye por uuid en O0.3. |
| 2 | `claimTopic: string` → `claim_topic_id` | `ClaimTopicsRepository.resolve(idOrCode)` resuelve número o `code`; el topic inexistente es error de validación. |
| 3 | Campos `document*` embebidos | Salen de `claim_requests`; el DTO los reconstruye desde `document_files` (join del primer documento). El flujo upload→claim se reordena en O0.3. |
| 4 | GridFS → `bytea` | Repositorio neutro: el llamador declara `encryptionAlgo`. **Deuda declarada:** en O0.3 se pasará `'none'`; el cifrado real AES-256-GCM es **O5.4** (D-093/D-098). |
| 8 | `reviewed_by` obligatorio | `review()` lo exige en el tipo (el CHECK del esquema lo impone). Hasta O1.2 (recuperación desde firma), la ruta usará el `issuer_address` de la solicitud como revisor. |
| 12 | `tokens_registries_required` | `CreateTokenInput` **exige** los tres registries (fail-closed, RF-W-11); O0.3 deberá tomarlos del cuerpo o del artefacto de despliegue. |
| 14 | Pool por app | Resuelto: pool único compartido; las 3 copias de `lib/mongodb.ts` se retiran en O0.3. |

## 4. Desviaciones y deuda declarada

- **Sin transporte de errores HTTP todavía:** la traducción error tipado → código de estado (400/404/409/503) se aplica en O0.3, al reescribir las rutas.
- **Sin validación `zod` en los repositorios:** la validación de entrada con esquemas (RT-W-03) llega en O1/O3; ahora se valida lo imprescindible (direcciones, tipos).
- **Serializadores como contrato de transición:** `_id`, `requiredClaims`, `complianceModules` y `document*` se mantienen por compatibilidad; O1/O4 los revisan.

*Fin de la evidencia — O0.2*
