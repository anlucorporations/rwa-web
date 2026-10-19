# 🏦 RWA Web — identidad, emisión y mercado de tokens RWA

Monorepo de la etapa `@web`: **3 apps Next.js** sobre una base compartida, con identidad
on-chain (ERC-3643), claims firmadas por emisores y creación/gestión de tokens RWA.

> Documentación técnica de la línea: [`RepoTecnico/README.md`](RepoTecnico/README.md).
> Requisitos: [`requerimientos_web.md`](RepoTecnico/requerimientos_web.md) ·
> Plan: [`plan_desarrollo_web.md`](RepoTecnico/plan_desarrollo_web.md) ·
> Estado: [`estado_proyecto.md`](RepoTecnico/estado_proyecto.md).

---

## 🎯 Aplicaciones

| App | Paquete | Puerto | Rol | Funciones |
|---|---|---|---|---|
| **identity** | `@rwa/identity` | 4001 | Inversor | Crear/registrar identidad on-chain, solicitar claims, subir documentos, añadir claims a la identidad |
| **issuer** | `@rwa/issuer` | 4002 | Emisor | Gestionar trusted issuers (owner), revisar solicitudes, firmar aprobaciones EIP-712 y rechazos EIP-191 |
| **token** | `@rwa/token` | 4003 | Creador/inversor | Crear tokens RWA (clon EIP-1167), ClaimTopicsRegistry por token, comprar/transferir tokens |

Paquetes compartidos:

| Paquete | Contenido |
|---|---|
| `@rwa/shared` | Red y direcciones generadas desde `rwa-sc`, ABIs, capa PostgreSQL, validación `zod`, cliente API tipado, claims EIP-712, logger, web3 (wagmi/viem) |
| `@rwa/ui` | Primitivas y `RequestDetailModal` compartido (variantes inversor/emisor) |
| `@rwa/config` | Presets compartidos de TypeScript y ESLint |

---

## 🚀 Arranque rápido

Requisitos: **Node ≥ 20**, **pnpm 9.15.9** (Corepack), acceso al **Anvil de GCP** (chain 31337) y a
**PostgreSQL** (Cloud SQL). MetaMask para las operaciones on-chain.

```bash
corepack enable
pnpm install

# 1) Variables de entorno (sin secretos en el repo)
cp .env.example .env.local        # rellenar NEXT_PUBLIC_RPC_URL y DATABASE_URL
source scripts/gcp-env.sh --tcp   # alternativa: exporta RPC y DATABASE_URL desde GCP

# 2) Arrancar las 3 apps en desarrollo
./start-all.sh                    # identity 4001 · issuer 4002 · token 4003

# 3) Estado y parada
./check-status.sh
./stop-all.sh
```

También se puede arrancar una app suelta: `pnpm dev:identity`, `pnpm dev:issuer`, `pnpm dev:token`.

### Entorno reproducible con Docker

```bash
cp .env.compose.example .env.compose   # rellenar secretos
docker compose --env-file .env.compose up --build
# identity :4001 · issuer :4002 · token :4003 · PostgreSQL :5432
# Anvil local opcional: docker compose --profile chain up
```

Imágenes multi-stage con `output: "standalone"`, `PORT` configurable y healthcheck HTTP en
`/api/health` (ver [`Dockerfile`](Dockerfile) y [`docker-compose.yml`](docker-compose.yml)).

---

## 🏗️ Arquitectura

- **Web3**: `wagmi` + `viem` en las 3 apps; **cero `ethers`** y cero `window.ethereum` (conector
  inyectado). Lecturas con `PublicClient`, escrituras con `WalletClient`.
- **Datos de cliente**: TanStack Query (claves por entidad, invalidación tras mutaciones).
- **Datos off-chain**: PostgreSQL (esquema `rwa`) con pool único en `@rwa/shared/db`; documentos KYC
  en `rwa.document_files`.
- **Contratos**: direcciones y ABIs **generadas** desde `rwa-sc` (`scripts/sync-contracts.sh`); el gate
  `check-contract-drift.sh` impide derivas. Red canónica: **Anvil de GCP (chain 31337)**.
- **Sesión**: SIWE (EIP-4361) con cookie `httpOnly` firmada; autorización por propiedad en las rutas.
- **Claims**: aprobación con firma **EIP-712** y `addClaim` de 7 argumentos (`uriHash`, D-083).

```
rwa-web/
├── apps/
│   ├── identity/        # identidad + claims (4001)
│   ├── issuer/          # panel del emisor (4002)
│   └── token/           # factoría + marketplace (4003)
├── packages/
│   ├── shared/          # red, ABIs, db, api, validación, web3
│   ├── ui/              # componentes compartidos
│   └── config/          # presets TS/ESLint
├── RepoTecnico/         # documentación, evidencias y artefactos de datos
├── scripts/             # gates, CI local y E2E
├── Dockerfile           # imagen multi-stage (ARG APP=identity|issuer|token)
├── docker-compose.yml   # 3 apps + PostgreSQL + Anvil opcional
├── start-all.sh · stop-all.sh · check-status.sh
└── .env.example
```

---

## 🧪 Gates y pruebas

```bash
pnpm -r typecheck                 # 0 errores TS (6 paquetes)
pnpm -r lint                     # 0 errores (warnings de deuda declarada)
./scripts/ci_local.sh            # gates + tsc + lint + build ×3 + tests

bash scripts/check-network-literals.sh   # 0 literales de red
bash scripts/check-contract-drift.sh     # ABIs y direcciones sincronizadas con rwa-sc
bash scripts/test_auth_o1.sh             # 30/30 autorización
bash scripts/test_review_o1.sh           # 5/5 flujo de revisión firmado
bash scripts/test_token_o2.sh            # 5/5 flujo de token
bash scripts/test_e2e_o2.sh              # E2E contra Anvil (requiere despliegue actualizado)
```

Estado actual: **build ×3 y 35 tests en verde**. El E2E contra el Anvil de GCP está pendiente del
redespliegue del stack canónico desde `@sc` (build anterior a D-083); ver
[`RepoTecnico/pruebas/o2_7_e2e_anvil.md`](RepoTecnico/pruebas/o2_7_e2e_anvil.md).

---

## 🔑 Red y cuentas de prueba

Red canónica: **Anvil de GCP**, `chainId 31337`, RPC en `NEXT_PUBLIC_RPC_URL`
(ver [`.env.example`](.env.example)). Cuentas públicas de Anvil (solo desarrollo):
`ADMIN/Owner`, `User 1 / Issuer`, `User 2` — ver `DEMO_ACCOUNTS` en `@rwa/shared/network`.

**Nunca** usar esas claves en redes reales.

---

## 🎯 Claim topics

| ID | Nombre | Uso |
|---|---|---|
| 1 | KYC | Inversión en tokens |
| 7 | Accredited Investor | Inversión en tokens |
| 9 | Jurisdiction | Cumplimiento geográfico |

---

## 🔐 Seguridad

- Sesión SIWE + cookies firmadas; rutas de escritura protegidas por propiedad.
- Documentos KYC **cifrados en reposo con AES-256-GCM** (`KYC_ENCRYPTION_KEY` obligatoria, O5.4);
  se descifran solo tras autorizar al titular/emisor, con `attachment` + `nosniff` y magic bytes.
- Retención y backup del esquema `rwa`:
  `./scripts/retention_o5.sh [--dry-run]` y `./scripts/backup_o5.sh [--restore <dump>]`.
- Secretos fuera del repositorio (`.env.local` ignorado, `.env.example` plantilla; Secret Manager en GCP).
- 0 logs por consola (`no-console: error`); logger estructurado en servidor.

---

## 🌐 Stack

Next.js 16 · React 19 · TypeScript · TailwindCSS v4 · wagmi + viem · TanStack Query ·
PostgreSQL (`pg`) · zod · Foundry/Anvil · pnpm workspaces.

## 📄 Licencia

MIT
