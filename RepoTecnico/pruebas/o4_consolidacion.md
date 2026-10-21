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


## Ronda 8 · Escrituras a viem/wagmi (bloque mayor de `apps/token`)

- `apps/token/components/CreateTokenForm.tsx`: alta de token con `useWalletClient().writeContract`
  (`createTokenWithRegistries`), ClaimTopicsRegistry (`createRegistryForTokenWithTopics`),
  `setClaimTopicsRegistry`, `setMaxSupply` y `addComplianceModule`; confirmaciones con
  `getPublicClient().waitForTransactionReceipt`; dirección del clon por `decodeEventLog(TokenCreated)`
  (fallback `getTotalTokens`/`getTokenAt`). `assertCanonicalChain` usa `useChainId` (O2.5).
- `apps/token/components/TokensList.tsx`: saldos y precios con `readContract`; `addComplianceModule`
  y `setPrice` con `writeContract`; validación de dirección con `viem.isAddress`.
- `apps/token/app/marketplace/page.tsx`: compra (`buyToken` con `value`), transferencia, diagnóstico de
  compliance y lecturas de precio/saldo/pausa/frozen/registries con viem; errores de wallet
  normalizados (`shortMessage`/`cause`, sin códigos de `ethers`) y revert decodificado con
  `decodeErrorResult`.
- `apps/token/lib/contracts/market.ts`: ABI viem mínima (`pricePerToken`, `setPrice`, `buyToken`)
  porque el artefacto generado no declara esas funciones (deuda: alinear con `rwa-sc`; la UI de
  mercado es anterior al artefacto O2.2).
- `RequestDetailModal` (identity/issuer): firma EIP-712 y `addClaim` con wagmi/viem; se limpian los
  imports muertos que quedaban en el árbol de trabajo.
- **`ethers` restante: 12 → 7 ficheros**. `apps/token` queda **sin `ethers` en runtime** (solo el
  `types/ethereum.d.ts` ambiental). Pendientes: dashboard de emisor, identidad (WalletContext,
  ClaimRequestForm, lib/contracts y app/app) y los `types/ethereum.d.ts`.

**Verificación:** `tsc` 0 · lint 0 errores · `./scripts/ci_local.sh` **exit 0** (gates de literales y
deriva · build ×3 · 35 tests).

*Fin de la evidencia — O4.6 (ronda 8)*


## Ronda 9 · Cierre de O4.6: identidad y emisor a viem

- `apps/identity/contexts/WalletContext.tsx`: deja de exponer `ethers.BrowserProvider`; solo mantiene
  estado de conexión y acciones wagmi. Los componentes obtienen `PublicClient`/`WalletClient` con
  `usePublicClient`/`useWalletClient`.
- `apps/identity/lib/contracts.ts`: reducido a las direcciones canónicas (sin helpers de `ethers`).
- `apps/identity/app/app/page.tsx`: creación de identidad (`createIdentity`) y registro
  (`registerIdentity`) con `writeContract` + `waitForTransactionReceipt`; dirección del clon por
  `decodeEventLog(IdentityCreated)`; lecturas `isRegistered`/`getIdentity` y claims con `readContract`.
- `apps/identity/components/ClaimRequestForm.tsx`: lectores del TrustedIssuersRegistry con
  `readContract` y firma con `walletClient.signMessage` (API viem, sin `personal_sign` de ethers).
- `apps/identity/components/ClaimRequestsList.tsx`: sin dependencia del provider de ethers.
- `apps/issuer/app/dashboard/page.tsx`: lecturas del registro y `addTrustedIssuer` con viem; conexión
  con `useConnect`/`useSwitchChain` y `disconnect` de wagmi; eliminado `checkMetaMask`/`BrowserProvider`.
- `@rwa/shared/errors` se exporta como subruta para que los componentes cliente validen
  `ValidationError` sin arrastrar la capa `db`/`pg` del índice raíz.
- Eliminados los 3 `types/ethereum.d.ts` ambientales y **`ethers` desinstalado** de los 3 `package.json`
  (lockfile regenerado).
- **`ethers` restante: 7 → 0 ficheros. 0 imports de `ethers` en el monorepo.** RT-W-02 cumplido.

**Verificación:** `tsc` 0 · lint 0 errores · `./scripts/ci_local.sh` **exit 0** (gates de literales y
deriva · build ×3 · 35 tests).

*Fin de la evidencia — O4.6 (ronda 9, cierre)*


## Ronda 10 · O4.7: datos de cliente con TanStack Query

- `@rwa/shared/api/client` se exporta como subruta segura para cliente (cliente API tipado).
- **token**: `lib/queries.ts` con `useTokensQuery` (claves por admin/refresh) y `tokenKeys`;
  `TokensList` y `marketplace` consumen la query (loading/error/refetch centralizados) y
  `CreateTokenForm` invalida `tokenKeys.all` al crear.
- **identity**: `lib/queries.ts` con `useClaimRequestsQuery`, `useTrustedIssuersQuery` (lectura
  on-chain + nombres de la API) y `useCreateClaimRequestMutation` (invalidación). `ClaimRequestsList`
  y `ClaimRequestForm` ya no hacen `fetch`+estado manual.
- **issuer**: `lib/queries.ts` con `useIssuerRequestsQuery`, `useTrustedIssuersQuery` y
  `useUpdateRequestMutation`; `IssuerRequestsList`, dashboard (`useReadContract` para `isTrustedIssuer`)
  y `RequestDetailModal` usan las queries/mutaciones y la invalidación.
- Las mutaciones que siguen con `fetch` directo (`/api/upload`, módulos/claims/price de token)
  mantienen la UI y refrescan vía `invalidateQueries`/`refetch`; su paso a `useMutation` queda como
  mejora incremental (no bloquea O4.7).

**Verificación:** `tsc` 0 · lint 0 errores · `./scripts/ci_local.sh` **exit 0** (build ×3 + 35 tests).

*Fin de la evidencia — O4.7*


## Ronda 11 · O4.2/O4.3: `@rwa/ui`, `@rwa/config` y modal unificado

- **`packages/ui`** (nuevo, `@rwa/ui`): primitivas compartidas (`Modal`, `StatusBadge`,
  `InfoField`, `CodeBlock`) y **`RequestDetailModal` único** con variante `investor` | `issuer`
  y slot `actions` para la lógica de cada rol.
- `apps/identity/components/RequestDetailModal.tsx` y `apps/issuer/components/RequestDetailModal.tsx`
  pasan a ser envoltorios finos (lógica viem/EIP-712 intacta) sobre `@rwa/ui`: se elimina la
  duplicación de markup (≈800 líneas → 1 componente + 2 wrappers).
- Ambos `next.config.ts` transpilan `@rwa/ui`; `@rwa/ui` añadido como dependencia de workspace.
- **`packages/config`** (nuevo, `@rwa/config`): preset de TypeScript (`typescript/base.json`) y
  reglas de ESLint compartidas (`eslint/base.mjs`: React Compiler como aviso, `any` como aviso,
  `no-console` como error). Las 3 apps extienden ambos presets (fuente única de tooling) y el
  registro de apps/puertos vive en `src/index.ts`.
- Duplicados restantes del alcance O4.3: **0** (los dos `RequestDetailModal` comparten presentación).

**Verificación:** `tsc` 0 (6 paquetes) · lint 0 errores · `./scripts/ci_local.sh` **exit 0**
(gates de literales y deriva · build ×3 con `@rwa/ui` · 35 tests).

*Fin de la evidencia — O4.2/O4.3*


## Ronda 12 · O5.1–O5.3 y O5.8: entorno reproducible y documentación

- **Dockerfile** multi-stage único (build arg `APP=identity|issuer|token`): `pnpm install
  --frozen-lockfile`, build de la app, runtime `standalone` con usuario no-root, `PORT`
  configurable, `HOSTNAME=0.0.0.0` y `HEALTHCHECK` HTTP contra `/api/health`.
- **docker-compose.yml**: PostgreSQL 16 (con `base_datos.sql` como init), Anvil opcional
  (`--profile chain`), las 3 apps con build args `NEXT_PUBLIC_*`, variables de entorno, puertos
  4001/4002/4003, `depends_on: db healthy` y healthchecks.
- **`.env.compose.example`**: plantilla sin secretos (`POSTGRES_*`, `DATABASE_URL`,
  `NEXT_PUBLIC_*`, `SIWE_SESSION_SECRET`, `KYC_ENCRYPTION_KEY`).
- **O5.3**: `start-all.sh`, `stop-all.sh` y `check-status.sh` reescritos para el monorepo
  (`pnpm dev:<app>`, logs `.pids`/`logs`, health real); sin rutas antiguas (`web-identity`,
  `web-registry-trusted`, `web-token`) ni artefactos `docker-build/`.
- **O5.8**: README raíz reescrito con el mapa real (3 apps + 3 paquetes), arranque, Docker,
  gates, stack (`wagmi`+`viem`, PostgreSQL, TanStack Query) y estado de O2.7.
- Verificación local: `bash -n` de los 3 scripts, YAML de compose válido, plantilla no ignorada y
  `CI_SKIP_BUILD=1 ./scripts/ci_local.sh` **exit 0** (tsc/lint/tests). **`docker compose up` no se
  ejecutó: el entorno de desarrollo no tiene Docker**; queda como verificación pendiente en un host
  con Docker (gate de O5.1 en el plan).

*Fin de la evidencia — O5.1/O5.2/O5.3/O5.8 (assets)*


## Ronda 13 · O5.4/O5.5: cifrado KYC y operación de datos

- **`@rwa/shared/media/kyc-crypto`**: AES-256-GCM con clave de 32 bytes desde
  `KYC_ENCRYPTION_KEY` (hex/base64), IV aleatorio de 12 bytes, authTag al final del ciphertext y
  fail-closed si la clave falta o es inválida. `decryptDocument` mantiene lectura de filas antiguas
  con `encryption_algo = 'none'` y rechaza algoritmos desconocidos. Añadido `hashesEqual`
  (comparación en tiempo constante).
- **`POST /api/upload`** cifra antes de persistir (`content` cifrado, `sha256`/`size_bytes` del
  texto plano); **`GET /api/download/[fileId]`** (identity e issuer) descifra solo después de
  autorizar y registra `audit_log`.
- Tests nuevos: `kyc-crypto.test.ts` (7 casos: roundtrip, nonce único, clave errónea, legacy `none`,
  algoritmo inválido, lectura de clave hex/base64 y comparación de hashes) → **42 tests en verde**.
- **O5.5**: `scripts/retention_o5.sh` (poda de `sessions` caducadas/revocadas y `audit_log`;
  `--dry-run`) y `scripts/backup_o5.sh` (`pg_dump` custom del esquema `rwa` + `pg_restore --clean`);
  `backups/` ignorado por git; índices de apoyo ya existen en `base_datos.sql` §6.
- Verificación: gates + tsc + build ×3 + **42 tests** (ejecución de retención/backup pendiente de
  `psql`/DATABASE_URL; no hay PostgreSQL en este entorno).

*Fin de la evidencia — O5.4/O5.5 (código y scripts)*


## Ronda 14 · O5.6/O5.7: accesibilidad estática y presupuesto de rendimiento

- **O5.6** — `scripts/a11y_o5.mjs`: auditoría con **axe-core + jsdom** sobre el HTML prerenderizado
  de las 7 rutas (WCAG 2.0/2.1 A y AA). Detectó un fallo real (`button-name` crítico en los botones
  de menú móvil de los 3 headers) que se corrigió añadiendo `aria-label`, `aria-expanded` y
  `aria-controls`. Resultado final: **7/7 páginas, 0 violaciones críticas/graves**.
  Limitación declarada: es un gate estático; los estados dinámicos/foco requieren auditoría de
  navegador (diferida por falta de browser en el entorno).
- **O5.7** — `scripts/perf_budget_o5.mjs`: mide el First Load JS gzip por ruta desde el HTML de
  `next build` (chunks referenciados + scripts inline) con presupuesto `PERF_BUDGET_KB=400`.
  Baseline medido: identity/app **367.6 KB**, issuer/dashboard **302.7 KB**, token/marketplace
  **304.9 KB**, landings **288–302 KB** → **7/7 dentro de presupuesto**.
- Ambos gates quedan integrados en `./scripts/ci_local.sh` (paso 6/7, después del build) y como
  scripts raíz `pnpm a11y:o5` y `pnpm perf:o5`.

**Verificación:** `pnpm a11y:o5` exit 0 · `pnpm perf:o5` exit 0 · `./scripts/ci_local.sh` exit 0
(build ×3 + 42 tests).

*Fin de la evidencia — O5.6/O5.7*


## Ronda 15 · O5.5 ejecutado contra Cloud SQL

Se sustituyen los scripts de shell (dependían de `psql`/`pg_dump`, no instalados) por
implementaciones Node con `pg`, y se ejecutan contra el **PostgreSQL real de GCP**
(`scripts/gcp-env.sh --tcp`, Cloud SQL `truekeate-db-dev`):

- `node scripts/retention_o5.mjs --dry-run` → sessions 0, audit_log 0.
- `node scripts/retention_o5.mjs` (real) → **0 sesiones y 0 registros eliminados** (BD limpia).
- `node scripts/backup_o5.mjs` → backup lógico de las **10 tablas** de `rwa`
  (`backups/rwa-2026-10-20T00-39-37-248Z.json`, sha256 `f8224bd6…`, 7 filas: 5 topics +
  2 migraciones).
- `node scripts/backup_o5.mjs --restore <dump>` → **simulación de restauración OK (ROLLBACK)**:
  7 filas insertadas en 10 tablas dentro de una transacción revertida (prueba del camino de
  restauración sin tocar datos).
- Scripts raíz: `pnpm db:backup` y `pnpm db:retention`; `backups/` ignorado por git.

**Verificación:** comandos exit 0 contra Cloud SQL real. Restauración con `--commit` no se ejecuta
en la BD de desarrollo (requiere ventana de mantenimiento); el camino SQL queda validado con ROLLBACK.

*Fin de la evidencia — O5.5 ejecutado*


## Ronda 16 · O5.6 auditoría de navegador real + apps en vivo

Con Chromium/Playwright y las 3 apps de producción sirviendo contra el **PostgreSQL y el Anvil de
GCP reales** (`scripts/serve_o5.mjs`, puertos 4011/4012/4013; `/api/health` = `status ok` en las 3):

- `node scripts/a11y_browser_o5.mjs` — axe-core inyectado en el DOM hidratado (WCAG 2.0/2.1 A+AA)
  sobre 7 rutas. Detectó problemas que el gate estático no puede ver (requieren CSS/layout):
  - `color-contrast` serio en identity landing (`text-cyan-600` sobre blanco, 3.61:1),
    issuer landing (`text-gray-500` sobre `bg-blue/indigo-50` y `text-green-600`) e issuer
    dashboard (`text-red-600` sobre `bg-red-50`).
  - Correcciones: `cyan-600 → cyan-700`, `gray-500 → gray-600` en fondos tintados,
    `green-600 → green-700`, `red-600 → red-700`.
- Resultado final: **7/7 rutas, 0 violaciones críticas/graves** en navegador.
- El script está disponible como `pnpm a11y:browser:o5` (requiere `playwright install chromium`;
  en este host se completaron las librerías del sistema con `.deb` extraídos en `/tmp`, sin root).
- `scripts/serve_o5.mjs` levanta/para las 3 apps de producción para verificaciones O5.

**Verificación:** health 3/3 (`chainId 31337`, `database ok`) · `a11y:browser:o5` exit 0 ·
`./scripts/ci_local.sh` exit 0 (gate estático + build ×3 + 42 tests).

*Fin de la evidencia — O5.6 dinámico*


## Ronda 17 · O5.1/O5.2: bloqueo del entorno para validar contenedores

Comprobaciones realizadas para intentar ejecutar el gate de O5.1/O5.2 en este host:

```text
command -v docker podman buildah nerdctl   → ninguna disponible
sudo -n true                               → "no new privileges" (sin root)
unshare -Ur true                           → Operation not permitted (sin user namespaces)
```

Por tanto **no es posible** construir las imágenes ni ejecutar `docker compose up` aquí; los assets
quedan validados estáticamente (YAML de compose parseado, Dockerfile con stages/HEALTHCHECK/CMD
verificados, `.env.compose.example` no ignorado) y el gate real queda pendiente de un host con Docker.

*Fin de la evidencia — O5.1/O5.2 bloqueados por entorno*


## Ronda 18 · O5.6: notificaciones unificadas (fin de `alert()`)

- Nuevo `ToastProvider`/`useToast` en **`@rwa/ui`**: notificaciones accesibles
  (`role="status"`/`role="alert"`, `aria-live`, cierre con `aria-label`), autodescarte
  (5 s éxito/info, 8 s error) y variantes `success`/`error`/`info`.
- Montado en los `Web3Providers` de las 3 apps (token pasa a depender de `@rwa/ui` y a
  transpilarlo).
- **29 `alert()` sustituidos** en 9 componentes de las 3 apps (`dashboard` del emisor, landings,
  marketplace/factory, `TokensList`, `CreateTokenForm`, `ClaimRequestForm`, `RequestDetailModal`).
- `confirm()`/`prompt()` se mantienen (diálogos nativos de decisión/entrada, fuera del alcance de
  notificaciones).

**Verificación:** `tsc` 0 · lint 0 errores · `./scripts/ci_local.sh` exit 0 (build ×3, axe/perf y
42 tests con cobertura). La axe de navegador (`a11y:browser:o5`) cubre el contenedor de toasts al
renderizarse.

*Fin de la evidencia — O5.6 notificaciones*


## Ronda 19 · O5.1/O5.2: validación estática de Docker (sin daemon)

Con Docker ausente en el entorno se añade un gate estático reproducible para no dejar los assets
sin verificar:

- `scripts/docker_validate_o5.mjs` (**58/58 comprobaciones OK**):
  - **Dockerfile**: parseo con `dockerfile-ast`, stages `builder`/`runner`, `ARG APP` en ambos,
    `pnpm install --frozen-lockfile`, build por app, las 3 rutas `COPY` del standalone/static/public,
    `HEALTHCHECK` en `/api/health`, `CMD server.js`, usuario no-root y `PORT=3000`.
  - **Artefactos reales del build**: para las 3 apps existe `.next/standalone/apps/<app>/server.js`
    (y lee `process.env.PORT`/`HOSTNAME`), `standalone/node_modules`, `.next/static` y `public`.
  - **docker-compose.yml** validado contra el **esquema oficial compose-spec** (vendorizado en
    `scripts/schemas/compose-spec.json`, sin red) + semántica: servicios y `build.args.APP`,
    puertos `4001/4002/4003→3000`, `depends_on: db healthy`, secretos, `db` con init
    `base_datos.sql` y healthcheck, Anvil en `profile chain` con healthcheck.
  - **`.env.compose.example`** define todas las variables obligatorias.
- Integrado en `./scripts/ci_local.sh` (paso 6/7) y como `pnpm docker:validate:o5`.
- **Build real sigue bloqueado**: `docker: command not found` (sin `podman`/`buildah`, sudo
  deshabilitado y `unshare -Ur` denegado). Queda pendiente `docker build`/`docker compose up` en un
  host con Docker.

**Verificación:** `pnpm docker:validate:o5` exit 0 (58/58) · `CI_SKIP_BUILD=1 ./scripts/ci_local.sh`
exit 0 (incluye el nuevo paso).

*Fin de la evidencia — O5.1/O5.2 validación estática*


## Ronda 20 · Limpieza de deuda ejecutable (código muerto, warnings y endpoints debug)

- **Marketplace**: retirados `checkCompliance` y `transferToken` (≈380 líneas de código muerto no
  cableado a la UI) junto con su estado (`transferring`, `checkingCompliance`) e imports que solo
  usaban ellos.
- **Endpoints de depuración eliminados del árbol**: `GET /api/test-gridfs` (identity) y
  `GET /api/test-db` (token); ya no dependen de `ALLOW_DEBUG_ENDPOINTS` (B-2 más fuerte). El smoke
  `scripts/smoke_app_o0.sh` se actualizó para esperar **404** en ambos y **401** en
  `/api/claim-requests` sin sesión (6/6 probes).
- **Warnings accionables eliminados**: constantes de validación sin uso (`SYMBOL_RE`, `ADDRESS_RE`,
  `PRICE_RE`, `UUID_RE`), imports sin uso (`Button`, `setAddCompliance`), `catch (err)` vacíos y
  **todos los `any` de `TokensList` y del marketplace** (helpers `errorText/errorCode/errorReason`).
- Resultado de lint: **45 → 19 warnings**, **0 errores**; los restantes son deuda estructural
  declarada (React Compiler, `exhaustive-deps`, 2 `any` del primitivo `button.tsx`).
- `packages/config` mantiene el registro de apps/puertos como API pública del paquete (sin consumo
  interno; candidato a usarse en scripts de operación).

**Verificación:** `tsc` 0 · lint 0 errores · `./scripts/ci_local.sh` exit 0 (build ×3, axe/perf/
Docker estático, 42 tests con cobertura) · `scripts/smoke_app_o0.sh` **6/6** contra GCP (401 en
ruta protegida, 404 en endpoints retirados, health con `database:ok`).

*Fin de la evidencia — limpieza de deuda*


## Ronda 21 · Endurecimiento del CI remoto (GitLab)

`.gitlab-ci.yml` iguala el gate local:

- nuevo job **`quality:test`** (`pnpm -r test` con umbrales de cobertura 90/90/90/60).
- **`build:apps`** ejecuta además los gates de assets sobre el build: accesibilidad estática
  (`a11y_o5.mjs`), presupuesto de rendimiento (`perf_budget_o5.mjs`) y validación estática de Docker
  (`docker_validate_o5.mjs`).
- job **manual opcional `quality:a11y-browser`** con la imagen oficial
  `mcr.microsoft.com/playwright:v1.64.1-noble`: construye, arranca las 3 apps con `serve:o5`, espera
  readiness y ejecuta `a11y:browser:o5`; se marca `allow_failure` para no bloquear si no hay
  secretos/RPC en el runner.

**Verificación:** YAML válido (`yaml.safe_load`) y jobs listados; el gate equivalente local
(`ci_local.sh`, 7 pasos) sigue en verde.

*Fin de la evidencia — CI remoto*


## Ronda 22 · E2E de navegador del claim-flow y dos bugs reales corregidos

Se monta un E2E **real** (Playwright + wallet inyectada mock sobre viem, sin MetaMask) contra un
**Anvil local efímero** con el stack desplegado desde una copia temporal de `rwa-sc`:

- `scripts/e2e_local_o5.sh` automatiza: Anvil :8546 → despliegue → `deployments.ts` temporal →
  build ×3 → apps en 4011/4012/4013 (BD real de GCP) → E2E → restauración/limpieza.
- `scripts/e2e_claim_o5.mjs`: conecta wallet, crea/usa identidad, solicita claim (firma EIP-191 +
  POST autenticado), el emisor aprueba firmando **EIP-712**, y el inversor añade el claim con
  `addClaim`; verifica los 4 pasos en UI.
- **Resultado: E2E en verde** (`✓ E2E claim-flow en verde`), con `update-request` 200 y `addClaim`
  on-chain confirmado.

Bugs reales encontrados y corregidos por el E2E (no cubiertos por tests unitarios):

1. **La UI no creaba sesión SIWE**: las mutaciones autenticadas devolvían 401. Se añade
   `ensureSiweSession` en `@rwa/ui` y un `SiweSessionBridge` en cada app que firma el reto al
   conectar y **invalida las queries** que habían fallado con 401.
2. **`decodeEventLog` decodificaba el primer evento del ABI con topic coincidente**
   (`OwnershipTransferred`) y rompía la lectura de `IdentityCreated`/`TokenCreated`. Se comprueba
   `decoded.eventName` antes de leer `args` en identidad y en `CreateTokenForm`.

Nota de contrato (fuera de D-088): `IdentityRegistry.registerIdentity` es `onlyOwner`; el auto-registro
del inversor que asume la UI falla si la wallet no es el owner. El E2E usa la cuenta owner y se
documenta como limitación de producto a resolver en el contrato o con un flujo de registro por admin.

**Verificación:** E2E claim-flow en verde · `./scripts/ci_local.sh` exit 0 (canónico).

*Fin de la evidencia — E2E claim-flow*
