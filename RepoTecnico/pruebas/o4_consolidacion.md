# Evidencia O4 — Consolidación en monorepo (parcial: 4.1, 4.4, 4.5) · 2026-10-17

> **Ciclo:** O4 (plan §O4) · **Requisitos:** RF-W-14, RF-W-18, RT-W-05 · **Decisión:** D-089.
> **Estado:** O4.1 ✅ · O4.2 ✅ · O4.3 (parcial) · O4.4 ✅ · O4.5 ✅ · O4.6 **casi completo: 0 `window.ethereum`** (queda retirar `ethers` de los contratos) · O4.7 ⏳.

## O4.1 · Estructura del monorepo

```
rwa-web/
├── apps/
│   ├── identity/      @rwa/identity   (antes web-identity,         puerto 4001)
│   ├── issuer/        @rwa/issuer     (antes web-registry-trusted, puerto 4002)
│   └── token/         @rwa/token      (antes web-token,            puerto 4003)
├── packages/
│   └── shared/        @rwa/shared     (red, contratos generados, datos, auth, claims, media, logger)
├── pnpm-workspace.yaml   → packages/* + apps/*
├── pnpm-lock.yaml        (único)
└── scripts/  (.gitlab-ci.yml · ci_local.sh · gates · E2E)
```

- `git mv` de las 3 apps (`node_modules` y `.env.local` se movieron con ellas; las claves foráneas
  de `@rwa/shared` las regeneró `pnpm install`).
- Nombres de paquete normalizados `@rwa/{identity,issuer,token}`; scripts raíz y runner actualizados.
- `pnpm install` → *Done in 28.4s*; `pnpm -r exec pwd` reconoce 4 workspaces.
- Rutas de los scripts de gates/E2E actualizadas a `apps/*`.

**Gate:** `./scripts/ci_local.sh` → **exit 0** (literales · deriva · tsc · eslint · build ×3 · tests 25/25).

## O4.4 · Destino de `web-registry-trusted2` → **retirada** ✅

Duplicado experimental del panel de emisor (H-08 del informe de contratos) con ABIs de una generación
distinta y sin puerto ni documentación. El panel canónico es `apps/issuer`. **Retirada** (no aporta
cobertura funcional y multiplica el mantenimiento).

## O4.5 · Destino de `web-rwa` → **retirada** ✅

Landing de 164 líneas con enlaces a puertos inexistentes (3004/3005/3006). El objetivo de la etapa es
**3 apps**; se retira. Si más adelante se quiere un portal, se añadirá como página estática dentro de
`apps/identity` o como app propia con enlaces configurables.

## Pendiente del ciclo

| Tarea | Estado | Nota |
|---|---|---|
| O4.2 `packages/shared` completo (esquemas `zod`, cliente de API tipado, `packages/{ui,config}`) | ✅ **Validación zod en todas las rutas + cliente API tipado**; `packages/{ui,config}` se abordan junto a O4.3/O4.6 | ver abajo |
| O4.3 Eliminar duplicados | 🟡 **Parcial** — ver abajo | `packages/ui` pendiente para `RequestDetailModal` |
| O4.6 Unificar web3 en `wagmi`+`viem` y eliminar `window.ethereum` | ⏳ | cambio grande; varias rondas |
| O4.7 Estado de datos con TanStack Query | ⏳ | — |

*Fin de la evidencia parcial — O4.1/O4.4/O4.5*


## O4.3 · Deduplicación (parcial)

| Duplicado | Acción |
|---|---|
| `TrustedIssuersRegistry.ts` (identity ×1 + issuer ×1, divergentes) | **Consolidado** en `@rwa/shared/network` (`TRUSTED_ISSUERS_REGISTRY_ADDRESS/_ABI`, `TRUSTED_ISSUERS_NETWORK_CONFIG`, `TRUSTED_ISSUERS_CONTRACT_OWNER`); las apps quedan con un *shim* de 10 líneas que reexporta |
| `types/issuer.ts` (idénticos, **sin uso**) | **Eliminados** ambos |
| `types/claim-request.ts` (divergentes: `CreateClaimRequestDto` vs `UpdateRequestStatusDto`) | Tipo común `ClaimRequest` movido a `@rwa/shared` (`api/types.ts`); cada app conserva solo su DTO específico |
| `types/ethereum.d.ts` (×3, declaración ambiental global) | Se mantienen copias: son declaraciones ambientales por app (TS no comparte `declare global` desde un paquete sin `types` configurado) — deuda menor |
| `RequestDetailModal.tsx` (×2: 337 vs 474 líneas, UX distinta inversor/emisor) | ⏳ Pendiente: requiere `packages/ui` (componentes compartidos) |

**Verificación:** `tsc --noEmit` 0 errores en las 3 apps + shared · `./scripts/ci_local.sh` **exit 0** ·
`scripts/test_review_o1.sh` **5/5** y `scripts/test_auth_o1.sh` **30/30** tras el movimiento (rutas
`apps/*` y logs sanitizados).

*Fin de la evidencia — O4 (parcial)*


## O4.2 · Validación de entrada y cliente de API

### Esquemas `zod` (`@rwa/shared/validation`, RT-W-03)
Fuente única de validación para las 3 apps: `address`, `uuid`, firma de 65 bytes, `uint256`,
`siweNonce/siweVerify`, `createClaimRequest`, `claimPayload`, `updateRequest`, `issuersBatch`,
`issuerName`, `createToken` (3 registries + ≥1 topic + symbol), `setClaims/setCompliance/setModules/setPrice`.
`parseBody(schema, raw)` lanza `ValidationError` (400) con el campo culpable.

**Aplicado en todas las rutas de escritura:** `POST /api/auth/nonce|verify` (handlers compartidos),
`POST /api/claim-requests`, `POST /api/upload` (`claimRequestId` uuid), `POST /api/issuers/batch` (×2),
`POST /api/issuers`, `POST /api/update-request`, `POST /api/tokens`,
`POST /api/tokens/[id]/{claims,compliance,modules,price}`. Se retiraron las validaciones manuales y
los helpers duplicados de cada ruta.

### Cliente de API tipado (`@rwa/shared/api`)
`createApiClient({ baseUrl?, fetchImpl? })` → `get/post/request` sobre el contrato `{ success, data }`,
con `ApiClientError` (`status`, `code`) para errores HTTP y `NETWORK_ERROR` para caídas. Listo para que
los componentes migren en O4.7 (TanStack Query).

### Tests
`packages/shared`: **35 tests / 6 suites** en verde (antes 25), incluidos los 6 de validación y 4 del cliente.

**Verificación funcional (post-zod):** `test_auth_o1.sh` **30/30** · `test_review_o1.sh` **5/5** ·
`test_token_o2.sh` **5/5** · `./scripts/ci_local.sh` **exit 0** (builds + 35 tests).

*Fin de la evidencia — O4.2*


## O4.6 · Stack web3 único (parcial: fundación)

### Configuración compartida — `@rwa/shared/web3`
- `anvilGcpChain` (viem `defineChain`) con `id = CANONICAL_CHAIN_ID` y RPC inyectado por `NEXT_PUBLIC_RPC_URL` (sin literales).
- `createWagmiConfig()`: `createConfig` con conector `injected()`, transporte HTTP y `ssr: true`.

### Providers en las 3 apps
`apps/*/components/Web3Providers.tsx` (`'use client'`): `WagmiProvider` + `QueryClientProvider`
(**base ya lista para O4.7**) y cableado en los 3 `layout.tsx` (en identidad, envolviendo al
`WalletProvider` existente).

### Capa de wallet migrada (identidad)
`apps/identity/contexts/WalletContext.tsx` deja de usar `window.ethereum` directo y pasa a
`useAccount`/`useConnect`/`useDisconnect`/`useSwitchChain` de wagmi (conector inyectado, switch a la
cadena canónica). Conserva la API pública que consumen los componentes, incluido un
`ethers.BrowserProvider` derivado del conector mientras dure la migración de los contratos a viem.

### Verificación
`tsc --noEmit` 0 errores en las 3 apps · `./scripts/ci_local.sh` **exit 0** (build ×3 con SSR de
providers + 35 tests) · `test_auth_o1.sh` **30/30** · gate de literales 0.

### Avance de migración (ronda 2)
- `@rwa/shared/web3`: singleton `getWagmiConfig()` (los providers usan la misma instancia), `isInjectedWalletAvailable()` y `getInjectedEip1193()` (sustituyen a `window.ethereum`).
- `apps/token`: migrados `CreateTokenForm`, `app/factory` y `TokensList` al helper del conector; eliminado `lib/examples/TokenFactoryExample.tsx` (muerto). **42 → 24** usos (solo queda `app/marketplace/page.tsx`, 24).

### Rondas 4–5 · `apps/issuer` y `apps/identity` completas
- **issuer**: `dashboard`/`page` sustituyen listeners manuales por `useAccount` de wagmi; `dashboard`, `page`
  y `RequestDetailModal` derivan provider/signer del conector inyectado.
- **identity**: `lib/contracts.ts` elimina los helpers de wallet muertos (`getPreferredProvider`,
  `setupBesuNetwork`, `getWalletName`, `debugWallets`); `ClaimRequestForm` y `RequestDetailModal` usan el
  helper del conector; `WalletContext` ya estaba migrado.
- **`window.ethereum` en todo el monorepo: 82 → 0.** ✅ (RT-W-02, primer criterio)

## Ronda 3 · `apps/token` completa
`app/marketplace/page.tsx` migrado: listeners manuales sustituidos por `useAccount` de wagmi (sincroniza la
cuenta), y todos los proveedores/signers derivan del conector inyectado (`getInjectedEip1193`).
**`apps/token`: 42 → 0 usos de `window.ethereum`.**

### Pendiente (siguientes rondas)
| Ámbito | `window.ethereum` restantes |
|---|---|
| `apps/token` | **0** ✅ (ronda 3: marketplace migrado) |
| `apps/issuer` | **0** ✅ |
| `apps/identity` | **0** ✅ |

**Siguiente paso de O4.6:** quedan **12 ficheros que aún usan `ethers`** para llamadas a contratos. Migrarlos a
hooks `useReadContract`/`useWriteContract`/`useSignTypedData` (o `readContract`/`writeContract` de viem actions)
y desinstalar `ethers`. Después, O4.7 (TanStack Query).

*Fin de la evidencia — O4.6 (fundación)*


## Ronda 6 · Retirada progresiva de `ethers`

- `apps/issuer/app/page.tsx` (landing): reescrita con `useAccount`/`useConnect`/`useDisconnect` y
  `useReadContract` (`getTrustedIssuersCount`); sin `ethers`.
- `apps/token/app/factory/page.tsx`: conexión con hooks de wagmi; sin `ethers`.
- Eliminado `apps/issuer/lib/examples/TrustedIssuersExample.tsx` (muerto).
- **`ethers` restante: 13 ficheros** (claims/contratos y componentes con lecturas/escrituras:
  marketplace, TokensList, CreateTokenForm, dashboard de emisor, RequestDetailModal, WalletContext,
  lib/contracts y lib/identity-claims). Siguiente: pasar esas llamadas a viem/wagmi y desinstalar `ethers`.

**Verificación:** `tsc` 0 · lint 0 · `./scripts/ci_local.sh` exit 0 (build ×3 + 35 tests).

*Fin de la evidencia — O4.6 (ronda 6)*


## Ronda 7 · Capa de lectura a viem

- `@rwa/shared/web3`: **`getPublicClient()`** (viem `createPublicClient` sobre el RPC canónico),
  sustituto de `ethers.JsonRpcProvider` en lecturas.
- `apps/identity/lib/identity-claims.ts` reescrito con viem (`readContract`): `getIdentityClaims` y
  `claimExists` sin `ethers`; se retira `addClaimToIdentity` (código muerto). Los consumidores
  (`ClaimRequestsList`, `app/app/page.tsx`) ya no pasan provider.
- **`ethers` restante: 12 ficheros** (escrituras y firmas: marketplace, TokensList, CreateTokenForm,
  dashboard de emisor, RequestDetailModal, WalletContext, lib/contracts de identidad, app/app/page).

**Verificación:** `tsc` 0 · lint 0 · `./scripts/ci_local.sh` exit 0 (build ×3 + 35 tests).

*Fin de la evidencia — O4.6 (ronda 7)*
