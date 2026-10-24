# @rwa/indexer — Indexer off-chain de eventos on-chain

Implementa **RNF-401…404** (H-12/H-21): indexa los eventos de los contratos de `rwa-sc` en
PostgreSQL (esquema `rwa`, tablas `chain_events` e `indexer_state`) con historial consultable,
reconstrucción desde el bloque de despliegue y detección de eventos privilegiados.

## Cómo funciona

1. Lee los eventos canónicos de las **ABIs generadas** desde `rwa-sc` (`@rwa/shared/contracts`).
2. Recorre bloques en chunks con `eth_getLogs` (sin filtro de dirección) y decodifica cada log por
   `topic0`: así captura también eventos de **clones creados dinámicamente** (identidades, tokens,
   claim-topics registries).
3. Persiste lote + punto de control (`indexer_state.last_block`) en **una transacción**, con
   `ON CONFLICT` para ser idempotente y soportar reorgs (`removed`).
4. Clasifica riesgo (`high`/`medium`/`info`) para las alertas: mint/burn, freeze, cambios de rol,
   retirada de módulos de compliance, revocación de claims y propuestas de gobernanza.

## Uso

```bash
# 0) Entorno (RPC + DATABASE_URL reales de GCP)
source rwa-web/scripts/gcp-env.sh --tcp

# 1) Crear tablas (idempotente) y hacer backfill desde el bloque de despliegue
pnpm --filter @rwa/indexer start -- --once --init --from <bloque_despliegue>

# 2) Procesar una vez / en bucle
pnpm --filter @rwa/indexer start -- --once
pnpm --filter @rwa/indexer start -- --loop

# 3) Sin persistir (diagnóstico)
pnpm --filter @rwa/indexer start -- --once --dry-run --from 0
```

Variables: `RPC_URL` (o `NEXT_PUBLIC_RPC_URL`), `DATABASE_URL`, `INDEXER_ID`, `INDEXER_SCHEMA`,
`INDEXER_FROM_BLOCK`, `INDEXER_CHAIN_ID`, `INDEXER_CHUNK_SIZE`, `INDEXER_CONFIRMATIONS`,
`INDEXER_POLL_INTERVAL_MS`.

## Tests y drill

```bash
pnpm --filter @rwa/indexer typecheck
pnpm --filter @rwa/indexer test          # unitarios (sin red ni BD)
bash scripts/indexer_drill.sh            # drill real: Anvil + despliegue + esquema temporal
```

## Esquema

Las tablas están en `rwa-sc/RepoTecnico/base_datos.sql` §4b (canónico) y su espejo en
`rwa-web/RepoTecnico/base_datos.sql`; el DDL de `--init` las reproduce para tests/drills.

## Limitaciones / siguientes pasos

- No hay canal de alertas externo (email/Slack): `eventRisk` + log estructurado dejan el enganche
  listo (RNF-402/404). Detección ≤ 15 min con `INDEXER_POLL_INTERVAL_MS` bajo.
- Retención ≥ 12 meses (RNF-403): la tabla no borra; programar política de archivado si crece.
- Reorgs: se marcan `removed=true`, no se borran (auditable).
