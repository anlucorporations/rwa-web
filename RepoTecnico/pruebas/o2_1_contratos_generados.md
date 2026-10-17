# Evidencia O2.1 — Módulo de contratos generado desde `rwa-sc` (2026-10-14)

> **Tarea:** O2.1/O2.2 (parcial) del plan §O2 — módulo único de red y direcciones desde el artefacto
> de despliegue, ABIs regenerados y gate de deriva.
> **Requisitos:** RF-W-08, RF-W-09 · **Decisiones:** D-091/D-096 (red canónica), D-102 (artefactos compartidos).

## 1. Qué se creó

| Pieza | Detalle |
|---|---|
| `scripts/sync-contracts.sh` | Genera `packages/shared/src/contracts/` desde **solo lectura** de `rwa-sc/sc/abis/*.json` y del último artefacto `rwa-sc/sc/deployments/<chainId>-<timestamp>.json`. |
| `packages/shared/src/contracts/abis/*.ts` | **16 ABIs** como constantes `as const` (`<Contrato>Abi`). Cabecera `NO EDITAR`. |
| `packages/shared/src/contracts/deployments.ts` | `DEPLOYMENT_METADATA` (chainId 31337, bloque 524), `CONTRACT_ADDRESSES` (9 direcciones), `DEMO_TOKEN` (registries + compliance del token de demo), `getContractAddress(name)` tipado. |
| `packages/shared/src/contracts/index.ts` | Barrel generado. Subpath `@rwa/shared/contracts`. |
| `scripts/check-contract-drift.sh` | Regenera en temporal y **falla si difiere** del versionado (O2.6). |
| `scripts/check-network-literals.sh` | Gate de literales (direcciones `0x…40`, `localhost:`, `http://`, `31337/81234`) sobre el código fuente de las apps y `packages/shared` (O2.6). |

**Se eliminó** el cargador `fs` `packages/shared/src/config/deployment.ts` y su subpath: las direcciones
ya no se leen del disco en runtime, así que el grafo del cliente es seguro y se elimina el *tracing* de
Turbopack que encarecía el build.

## 2. Gate reproducible

```bash
./scripts/sync-contracts.sh          # ✓ Generados 16 ABIs + deployments.ts en packages/shared/src/contracts
./scripts/check-contract-drift.sh    # ✓ ABIs y direcciones sincronizados con rwa-sc (exit 0)
pnpm --filter @rwa/shared typecheck  # exit 0
```

**Corrección aplicada:** `export const XAbi = [ ... ] as const` con salto de línea antes de `as const`
producía `TS1434`; la generación envuelve el array en paréntesis (`= ( [...] ) as const`) y compila.

## 3. Estado de los gates de O2.6

- **`check-contract-drift`:** ✅ verde.
- **`check-network-literals`:** 🔴 **rojo a propósito** — es la línea base a limpiar en O2.2/O2.5:
  - **31 direcciones literales** (ABIs/constantes duplicadas en `web-identity/contracts`,
    `web-registry-trusted/lib/contracts`, `web-token/lib/contracts`, más comparaciones `0x000…0`).
  - **3 `localhost:8545`** y **4 chainIds** (`81234` en `web-identity`, `31337` en `web-token`).
  - Todas ellas **divergen** de la fuente de verdad `packages/shared/src/contracts/deployments.ts`.

## 4. Especificación detectada para O2.3 (EIP-712)

- Dominio: `{ name: 'RWA-Identity', version: '1', chainId, verifyingContract: <clon de identidad> }`.
- `CLAIM_TYPEHASH = keccak256("Claim(address walletOwner,uint256 topic,uint256 scheme,bytes32 dataHash,uint256 expiresAt,uint256 nonce,bytes32 uriHash)")`.
- `walletOwner = owner()` de la identidad; `dataHash = keccak256(_data)`; `uriHash = keccak256(bytes(_uri))`;
  `nonce = claimNonce(topic, issuer)` leído justo antes de firmar; `expiresAt = 0` = perpetuo.
- Firma con `signTypedData` (el emisor firma hoy EIP-191 con `signMessage` → **incompatible**, causa raíz
  del fallo del flujo).
- `addClaim(_topic, _scheme=1, _issuer, _signature, _data, _uri, _expiresAt)` = **7 args**, selector `0x16cd5ffe`.

*Fin de la evidencia parcial — O2.1*
