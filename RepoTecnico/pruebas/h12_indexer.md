# Evidencia — H-12/H-21 · Indexer off-chain de eventos on-chain (RNF-401…404)

> **Fecha:** 2026-10-24 · **Área:** indexación off-chain (`apps/indexer`, esquema `rwa`) · **Hallazgos:** H-12, H-21 (R-4)
> **Estado:** ✅ **Implementado, probado y ensayado** · ⏳ pendiente: canal de alertas externo (RNF-402/404) y política de archivado a 12 meses (RNF-403).

---

## 1. Qué se ha implementado

| Artefacto | Función |
|---|---|
| `rwa-sc/RepoTecnico/base_datos.sql` **v1.2** (§4b) | Nuevas tablas `rwa.chain_events` (historial consultable, `args` jsonb, `removed`) e `rwa.indexer_state` (punto de control). Índices por bloque/evento/contrato. Espejo sincronizado en `rwa-web/RepoTecnico/`. |
| `rwa-web/apps/indexer/` (`@rwa/indexer`) | Servicio CLI en el monorepo: catálogo de eventos generado desde las **ABIs canónicas** (`@rwa/shared/contracts`), `eth_getLogs` por chunks, decodificación por `topic0` (captura también **clones dinámicos**), persistencia transaccional + punto de control, idempotencia (`ON CONFLICT`), reorgs (`removed`), clasificación de riesgo. |
| `rwa-web/scripts/indexer_drill.sh` | Drill de integración: Anvil + despliegue + **esquema PostgreSQL temporal** + indexado + verificaciones + idempotencia. No toca el esquema `rwa` compartido. |
| `rwa-web/apps/indexer/src/catalog.test.ts` · `indexer.test.ts` | 14 tests unitarios (catálogo, decodificación, normalización, chunks, reanudación, confirmaciones, dry-run, riesgo). |

## 2. Catálogo de eventos (RNF-401/402)

Construido desde `rwa-sc/sc/abis/*.json` (sin firmas a mano), deduplicado por `topic0`:

- **Token**: `Transfer`, `ComplianceModuleAdded/Removed`, `Frozen/Unfrozen`, `Paused/Unpaused`, `DestinationAuthorized`, `LimitsUpdated`, `MaxSupplyUpdated`, `RoleGranted/Revoked/AdminChanged`, `*RegistrySet`.
- **Identidad/claims**: `ClaimAdded`, `ClaimRevoked`, `ClaimRemoved`.
- **Registro**: `IdentityRegistered/Removed/Updated`.
- **Issuers/topics**: `TrustedIssuerAdded/Removed`, `ClaimTopicsUpdated`, `ClaimTopicAdded/Removed`.
- **Compliance**: `ModuleAdded/Removed`, `TokenRegistered`, `MaxBalanceSet`, `MaxHoldersSet`, `LockPeriodSet`, `TokenContractSet`, `HolderAdded/Removed`, `TransferLocked`.
- **Factories**: `IdentityCreated`, `TokenCreated`, `RegistryCreated`, `RegistryCreatedForToken`.
- **Gobernanza**: `ProposalCreated/Approved/Executed/Cancelled`, `OwnerAdded/Removed`, `ThresholdUpdated`, `DelayUpdated`.

**Riesgo (RNF-402):** `high` = cambios de rol, freeze/pause, retirada de módulo, revocación de claim/identidad, propuestas ejecutadas, cambios de owners/umbral/delay, y **mint/burn** (`Transfer` con `from`/`to` en cero); `medium` = configuración (topes, módulos, topics, whitelist).

## 3. Esquema aplicado en Cloud SQL

`psql "$DATABASE_URL" -f rwa-sc/RepoTecnico/base_datos.sql` → **idempotente, exit 0**:

```
NOTICE: RWA off-chain PostgreSQL: 12 tablas en el esquema rwa...
INSERT 0 1   -- schema_migrations v1.2
```
Verificado: `information_schema.tables` contiene `chain_events` e `indexer_state`; migraciones `1.0, 1.1, 1.2`.

## 4. Pruebas ejecutadas

### 4.1 Unitarias

```bash
pnpm --filter @rwa/indexer typecheck   # exit 0
pnpm --filter @rwa/indexer test        # 14/14 tests
```

### 4.2 Drill de integración (Anvil + PostgreSQL temporal)

```bash
bash scripts/indexer_drill.sh
```

Resultado real (2026-10-24):

```
✓ Stack desplegado en bloque 3 · token=0xE451980132E65465d0a498c53f0b5227326Dd73F
✓ Esquema temporal creado
[indexer] esquema 'rwa_indexer_itest' inicializado
[indexer] bloques 0-3: 26 eventos
[indexer] OK ... bloques 0-3: 26 eventos (9 de riesgo alto) en 1 chunks
  eventos: ClaimTopicAdded,ClaimTopicsRegistrySet,ComplianceModuleAdded,DestinationAuthorized,
  IdentityCreated,IdentityRegistered,IdentityRegistrySet,LimitsUpdated,MaxBalanceSet,ModuleAdded,
  RegistryCreated,RoleGranted,RoleRevoked,TokenContractSet,TokenCreated,TokenRegistered,
  TrustedIssuerAdded,TrustedIssuersRegistrySet
✓ Eventos verificados: 26 filas · last_block=3 · args decodificados
✓ Idempotente: 26 filas tras reindexar desde 0
✓ DRILL INDEXER (H-12/H-21) EN VERDE
```

### 4.3 Dry-run contra el Anvil canónico de GCP (cadena real)

```bash
source rwa-web/scripts/gcp-env.sh --tcp
pnpm --filter @rwa/indexer start -- --once --dry-run --from 0
```

```
[indexer] bloques 0-558: 235 eventos (dry-run)
[indexer] OK ... bloques 0-558: 235 eventos (144 de riesgo alto) en 1 chunks [dry-run]
```

## 5. Mapeo a RNF

| RNF | Criterio | Estado |
|---|---|---|
| **RNF-401** | Indexer operativo con historial consultable | ✅ Implementado y ensayado (`chain_events`, catálogo por ABIs, backfill desde 0) |
| **RNF-402** | Alertas por mint/burn, forcedTransfer, freeze, revocación de claim, retirada de último módulo | 🟡 **Detección clasificada** (`eventRisk` + log); falta canal externo (email/Slack/on-call) |
| **RNF-403** | Retención ≥ 12 meses y reconstrucción desde el bloque del despliegue | ✅ Reconstrucción desde 0; retención: no se borra (política de archivado pendiente) |
| **RNF-404** | Detección ≤ 15 min para eventos privilegiados | 🟡 Con `INDEXER_POLL_INTERVAL_MS` bajo (5 s) se cumple en diseño; falta el canal de incidentes |
| **RNF-405** | Artefacto JSON por despliegue | ✅ Ya existente (Ciclo 9) |

## 6. Operación

```bash
source rwa-web/scripts/gcp-env.sh --tcp
# 1) tablas + backfill desde el bloque de despliegue (o 0)
pnpm --filter @rwa/indexer start -- --once --init --from 0
# 2) servicio continuo
INDEXER_POLL_INTERVAL_MS=5000 pnpm --filter @rwa/indexer start -- --loop
# consultas
psql "$DATABASE_URL" -c "SELECT event_name, count(*) FROM rwa.chain_events GROUP BY 1 ORDER BY 2 DESC;"
```

## 7. Limitaciones / siguientes pasos

1. **Canal de alertas** (RNF-402/404): enganchar `eventRisk` a Slack/email/on-call y añadir umbrales de mint/burn y reglas de negocio.
2. **Archivado/retención** (RNF-403): particionado o export periódico a almacenamiento frío a los 12 meses.
3. **Reorgs profundos**: se marcan `removed=true`; si se requiere, añadir reconciliación por `block_hash`.
4. **Despliegue del servicio**: añadir un servicio `indexer` a `docker-compose`/Cloud Run (fuera de O5).
5. **Eventos de `forcedTransfer`**: no hay evento dedicado en el token; se infiere de `Transfer` con origen autorizado (documentar la heurística si se necesita alerta específica).
