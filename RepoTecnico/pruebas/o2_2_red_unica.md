# Evidencia O2.2 · O2.5 — Red única y limpieza de literales (2026-10-14)

> **Tareas:** O2.2 (ABIs/direcciones desde artefactos, eliminar copias inline — parcial),
> O2.5 (chainId de wallet vs canónico), O2.6 (gate de literales).
> **Requisitos:** RF-W-08, RF-W-09, RNF-W-07 · **Decisiones:** D-091/D-096.

## 1. Fuente única de red (client-safe)

`packages/shared/src/network/index.ts` (nuevo subpath `@rwa/shared/network`), sin APIs de Node:

| Export | Uso |
|---|---|
| `CANONICAL_CHAIN_ID = 31337` | red canónica (D-096) |
| `ZERO_ADDRESS` | comparaciones de "sin configurar" sin literales |
| `getRpcUrl()` | `NEXT_PUBLIC_RPC_URL`, evaluado de forma perezosa (no rompe el build) |
| `getClientNetwork()` / `isCanonicalChain()` / **`assertCanonicalChain()`** | O2.5: la UI bloquea la operación si la wallet está en otra red |
| `DEMO_ACCOUNTS` | cuentas de Anvil (públicas por diseño) centralizadas para la guía del panel de emisor |

La única fuente de **direcciones** es `@rwa/shared/contracts` (`getContractAddress(...)`, generado en O2.1).

## 2. Qué se sustituyó (19 literales → 0)

| App | Antes | Ahora |
|---|---|---|
| `web-identity` | `0xDD75370…`/`0x7210f8…` (direcciones), Besu `https://besu1…`, `0x13D52`/81234, `0x575765…`, `0x3a9B…`, comparaciones `0x000…0` | `getContractAddress('IdentityRegistry'/'IdentityCloneFactory'/'TrustedIssuersRegistry')`, `CANONICAL_CHAIN_ID`, `getRpcUrl()`, `assertCanonicalChain(...)`, `ZERO_ADDRESS`; ABIs JSON locales → `IdentityRegistryAbi`/`IdentityCloneFactoryAbi`/`TrustedIssuersRegistryAbi` |
| `web-registry-trusted` | `0xa5e5E6…` (TIR), `0x3a9B…` (owner), Besu RPC/81234, cuentas Anvil con claves, `http://localhost:8545`, `31337` | `getContractAddress('TrustedIssuersRegistry')`, `DEMO_ACCOUNTS`, `getRpcUrl()`, `CANONICAL_CHAIN_ID`; ABI inline → `TrustedIssuersRegistryAbi` |
| `web-token` | `0xf4AC03…`, `0xDD7537…`, `0xe7f172…`, `0x9fe467…`, `0x098dA1…`, `http://localhost:8545`, `31337`, `81234`, dirección cero | `getContractAddress(...)`, `NETWORK_CONFIG` con getters (`CANONICAL_CHAIN_ID`, `getRpcUrl()`), `ZERO_ADDRESS`, `assertCanonicalChain()` en `CreateTokenForm` |

También se corrigió `web-identity/contexts/WalletContext.tsx` (fijaba el `BrowserProvider` a 81234,
lo que habría bloqueado la red canónica) y se amplió el gate a los directorios `contexts/`.

**Cierre de ABIs inline (O2.2, 2026-10-14):** además de las 3 copias de `web-identity`, se sustituyeron
las de `web-token` (`TOKEN_CLONE_FACTORY_ABI`, `TOKEN_CLONEABLE_ABI`, `MODULAR_COMPLIANCE_ABI`,
`TOKEN_COMPLIANCE_ABI` y los ABIs locales de `marketplace/page.tsx`) por los ABIs generados de
`@rwa/shared/contracts`. Deuda conocida: el ABI real no tiene `buyToken()`/`setPrice()`; el flujo de
compra del marketplace queda fuera de O2 (requiere un contrato de venta).

**Pendiente en O2.3/O2.4 (no es red, es ABI):** las copias inline de ABI de `IdentityCloneable`
(`web-identity/lib/identity-claims.ts`, `RequestDetailModal.tsx`, `.abi.json`) y de
`TokenCloneFactory`/`TokenCloneable`/compliance de `web-token` siguen siendo las antiguas; se
sustituyen al implementar `addClaim` de 7 args (O2.3) y la creación de token (O2.4).

## 3. Gate reproducible

```bash
./scripts/check-network-literals.sh
```
**Resultado real (exit 0):**
```
[check-network-literals] Escaneando 14 rutas de código fuente…
✓ Sin direcciones Ethereum literales (0x+40 hex)
✓ Sin 'localhost:' ni '127.0.0.1:'
✓ Sin URLs 'http://' de servicio
✓ Sin chainIds literales (31337/81234)
[check-network-literals] ✓ 0 literales de red en el código fuente
```

```bash
./scripts/check-contract-drift.sh      # ✓ sincronizados con rwa-sc
for d in web-identity web-registry-trusted web-token; do (cd $d && npx next build); done
```
**Resultado real:** `web-identity` exit 0 (78 s) · `web-registry-trusted` exit 0 (164 s) · `web-token` exit 0 (144 s).
`tsc --noEmit`: 0 errores en `web-identity`; se mantienen los 3 de `web-registry-trusted` y 2 de `web-token`
preexistentes (fuera de los ficheros tocados).

*Fin de la evidencia — O2.2/O2.5*
