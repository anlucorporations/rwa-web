# 📚 Guía Completa - Plataforma RWA (Real World Assets)

**Para Estudiantes y Desarrolladores**

> 🔄 **Actualizada (2026-10-28):** esta guía ya refleja el estado real del monorepo:
> **PostgreSQL** (esquema `rwa`) sustituye a MongoDB/GridFS (D-095/D-093), **wagmi + viem**
> sustituye a ethers.js, las apps son `apps/identity|issuer|token` + `apps/indexer`, el claim
> on-chain se firma con **EIP-712** y hay **SIWE** para sesiones. Las ABIs citadas se alinean
> con `../rwa-sc/CHANGELOG_ABIS.md`. El marketplace se marca explícitamente como **legacy**.

---

## 📖 Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Configuración e Instalación](#configuración-e-instalación)
4. [Aplicación 1: Identity (Puerto 4001)](#aplicación-1-identity)
5. [Aplicación 2: Issuer (Puerto 4002)](#aplicación-2-registry-trusted)
6. [Aplicación 3: Token Factory & Marketplace (Puerto 4003)](#aplicación-3-token-factory)
7. [Flujo Completo de Uso](#flujo-completo-de-uso)
8. [Smart Contracts](#smart-contracts)
9. [Base de Datos PostgreSQL](#base-de-datos-postgresql)
10. [Sistema de Firmas Digitales](#sistema-de-firmas-digitales)
11. [Troubleshooting](#troubleshooting)

---

## 📘 Introducción

### ¿Qué es RWA?

**Real World Assets (RWA)** son activos del mundo real tokenizados en blockchain:
- 🏠 Bienes raíces
- 💎 Obras de arte
- 📊 Acciones empresariales
- 🏦 Bonos y deuda

### ¿Qué hace esta Plataforma?

Esta plataforma permite:

1. **Crear identidades digitales** on-chain
2. **Solicitar claims** (KYC, Acreditación, Jurisdicción) a issuers verificados
3. **Aprobar/Rechazar claims** como issuer de confianza
4. **Crear tokens RWA** con compliance automático
5. **Comprar y transferir tokens** con verificación de compliance

---

## 🏗️ Arquitectura del Sistema

### Estructura de las Aplicaciones

```
rwa-web (monorepo pnpm)
│
├── apps/identity (Puerto 4001)
│   ├── Crear identidad on-chain
│   ├── Solicitar claims a issuers
│   └── Cargar claims aprobados al contrato (addClaim)
│
├── apps/issuer (Puerto 4002)
│   ├── Ver issuers de confianza
│   ├── Aprobar/Rechazar claim requests
│   └── Firmar el claim (EIP-712) y cargarlo on-chain
│
├── apps/token (Puerto 4003)
│   ├── Crear tokens RWA con factory (EIP-1167)
│   ├── Gestionar compliance modules y required claims
│   ├── Establecer precios ⚠️ (módulo legacy)
│   └── Marketplace para comprar/transferir ⚠️ (compra legacy)
│
└── apps/indexer (CLI)
    └── Copia eventos on-chain a PostgreSQL (rwa.chain_events)
```

### Stack Tecnológico

- **Frontend:** Next.js 16 + React 19, TypeScript, TailwindCSS (App Router)
- **Blockchain:** Ethereum (Anvil local / Anvil en GCP), **wagmi + viem** (sin ethers)
- **Base de Datos:** PostgreSQL 16, esquema `rwa` (D-095)
- **Storage:** documentos cifrados AES-256-GCM en `rwa.document_files` (`bytea`, D-093; sin GridFS)
- **Auth:** SIWE (EIP-4361) · **Wallets:** MetaMask y otras vía conector inyectado wagmi

---

## ⚙️ Configuración e Instalación

### Requisitos Previos

```bash
# Node.js v20+ y pnpm v9+
node --version
pnpm --version

# Docker (para PostgreSQL)
docker --version

# Anvil (Foundry)
anvil --version
```

### Instalación

```bash
# 1. Navegar a la raíz del monorepo pnpm
cd rwa-web

# 2. Instalar dependencias del monorepo completo (una sola vez)
pnpm install

# 3. Iniciar PostgreSQL (docker-compose del monorepo, esquema `rwa`)
docker compose up -d

# 4. Iniciar Anvil (en otra terminal)
anvil

# 5. Iniciar todas las apps
cd ..
./start-all.sh
```

### Puertos Asignados

| Aplicación | Puerto | URL |
|------------|--------|-----|
| **apps/identity** | 4001 | http://localhost:4001 |
| **apps/issuer** | 4002 | http://localhost:4002 |
| **apps/token** | 4003 | http://localhost:4003 |

### Scripts de Gestión

```bash
# Iniciar todas las apps
./start-all.sh

# Detener todas las apps
./stop-all.sh

# Ver estado de servicios
./check-status.sh
```

---

## 🆔 Aplicación 1: Identity (Puerto 4001)

### Propósito

Gestionar identidades digitales y solicitar claims (certificaciones) a issuers verificados.

### Funcionalidades Principales

#### 1. Crear Identidad

```
1. Conectar wallet (MetaMask vía wagmi)
2. Click "Crear identidad"
3. Firmar transacción
4. ✅ Identidad creada y registrada on-chain
```

**Resultado:** tu wallet queda asociada a su contrato de identidad mediante
`IdentityRegistry.registerIdentity(wallet, identity)`.

#### 2. Solicitar Claim a un Issuer

```
1. Sección "Request Claims from Issuers"
2. Seleccionar issuer de la lista
3. Seleccionar tipo de claim (KYC, Accreditation, Jurisdiction)
4. Escribir mensaje explicativo
5. Adjuntar documento (opcional)
6. Sistema firma digitalmente (requester + fecha)
7. Click "Submit Request"
8. ✅ Request guardado en PostgreSQL (tabla `rwa.claim_requests`)
```

**Datos guardados:**
- Requester address
- Issuer address
- Claim topic
- Mensaje
- Documento (cifrado AES-256-GCM en `rwa.document_files`)
- Firma digital del requester

#### 3. Ver Mis Requests

```
Lista de requests con estados:
• 🟡 Pending - Esperando revisión del issuer
• 🟢 Approved - Aprobado por el issuer
• 🔴 Rejected - Rechazado por el issuer
```

#### 4. Cargar Claims Aprobados

```
1. Request aprobado aparece con botón verde
2. Click "⬆️ Add Claim to Identity Contract"
3. Sistema llama a identity.addClaim() con (7 argumentos):
   - Claim topic
   - Scheme (1 = ECDSA / EIP-712)
   - Issuer address
   - Signature EIP-712 del issuer
   - Data (mensaje, fecha, etc.)
   - URI
   - expiresAt (0 = sin caducidad)
4. ✅ Claim cargado on-chain
5. Aparece en "Account Status"
```

### Account Status

Muestra todos los claims cargados en tu contrato de identidad:

```
Account Status:
• KYC - Know Your Customer
• Accredited Investor
• Jurisdiction Compliance
```

---

## 🏛️ Aplicación 2: Registry Trusted (Puerto 4002)

### Propósito

Panel para issuers de confianza para aprobar/rechazar solicitudes de claims.

### Funcionalidades Principales

#### 1. Ver Trusted Issuers

```
Lista de issuers registrados on-chain:
• Address
• Claim topics que pueden emitir
• Estado (activo/inactivo)
```

#### 2. Panel de Issuer (Solo para Issuers)

Si tu cuenta está registrada como issuer, verás:

```
📋 Issuer Panel

Pending Requests (5)
[All] [Pending] [Approved] [Rejected]

┌─────────────────────────────────────┐
│ Request from 0xf39F...2266          │
│ Claim: KYC - Know Your Customer     │
│ Message: "I need KYC verification..." │
│ Document: document.pdf [Download]   │
│ ✍️ Digitally signed by requester   │
│                                     │
│ [View Details]                      │
└─────────────────────────────────────┘
```

#### 3. Aprobar/Rechazar Claims

```
1. Click en request
2. Modal abre con detalles completos
3. Leer mensaje y documento
4. Escribir nota de revisión
5. Click [Approve] o [Reject]
6. Sistema firma digitalmente:
   - Request ID + Issuer + Decision + Timestamp
7. Firma con MetaMask
8. ✅ Request actualizado con firma del issuer
```

**Firma Digital del Issuer incluye:**
- Request ID
- Issuer address
- Requester address
- Claim topic
- Decision (approved/rejected)
- Timestamp
- Review note

#### 4. Ver Firmas

Cada request muestra:
- ✍️ Firma del requester (mensaje + signature)
- ✅ Firma del issuer (decisión + signature)

---

## 🏭 Aplicación 3: Token Factory & Marketplace (Puerto 4003)

### Propósito

Crear tokens RWA con compliance y gestionar un marketplace para compra/transferencia.

### Funcionalidades Principales

#### 1. Crear Token (Factory - Página Principal)

```
1. Conectar MetaMask
2. Formulario de creación:
   - Name: "Real Estate Token"
   - Symbol: "RET"
   - Decimals: 18
   - Description: "Tokenized real estate..."
   
3. Seleccionar claims requeridos:
   ☑ KYC - Know Your Customer
   ☑ Accredited Investor
   ☑ Jurisdiction Compliance
   
4. Click "Create Token"
5. MetaMask firma transacción
6. ✅ Token creado con EIP-1167 (clone pattern)
7. ✅ Guardado en PostgreSQL (tabla `rwa.tokens`)
```

**Gas Savings:** ~98.3% menos gas usando clones vs deployment completo

#### 2. Gestionar Compliance Modules

**Añadir Módulos:**
```
1. Token card → Sección "📦 Manage Compliance"
2. Click [➕ Add Compliance Module]
3. Prompt: Pegar dirección del módulo
4. MetaMask firma
5. Blockchain: addComplianceModule(0x...)
6. PostgreSQL: guarda en `rwa.tokens.compliance_modules`
7. ✅ Módulo añadido
```

**Ver Módulos:**
```
Compliance Modules (2):
#1 0x5b73c5498c1e... [👁️‍🗨️]
#2 0x90193c961a9... [👁️‍🗨️]
```

**Ocultar Módulos:**
```
Click [👁️‍🗨️] → Oculta de UI (sigue en blockchain)
```

#### 3. Gestionar Required Claims

**Ver Claims:**
```
Required Claims for Investment (3):
[KYC ✕] [Accredited Investor ✕] [Jurisdiction ✕]
```

**Remover Claim:**
```
Click [✕] en badge → Remueve de UI (puede seguir on-chain)
```

#### 4. Establecer Precio — ⚠️ Módulo LEGACY

> ❗ El precio del marketplace usa un ABI legacy (`pricePerToken`/`setPrice`, declarado a mano
> en `apps/token/lib/contracts/market.ts`) que el `TokenCloneable` actual **no expone**.
> Es material de demostración de UI; el flujo operativo hoy es la transferencia directa
> sujeta a compliance.
>
> 🔎 **Verificación automática (P1):** `node scripts/e2e_market_legacy.mjs` comprueba que el
> ABI generado desde `rwa-sc` no declara esas funciones y que `market.ts` sigue marcado como
> legacy. Con `E2E_RPC_URL` y `E2E_TOKEN_ADDRESS` definidos, además verifica on-chain que
> `pricePerToken()` no responde en el contrato desplegado.

```
1. Token card → "Price per Token: Not set"
2. Click [✏️ Edit]
3. Input aparece: [0.5] ETH
4. Cambiar valor
5. Click [💾 Save]
6. PostgreSQL actualizado (rwa.tokens.price)
7. ✅ Precio visible en Marketplace (solo UI)
```

#### 5. Marketplace - Comprar Tokens

**Navegar a Marketplace:**
```
Factory → Click [🏪 Marketplace]
O visitar: http://localhost:4003/marketplace
```

**Comprar Token:** ⚠️ LEGACY — `buyToken` no existe en el `TokenCloneable` actual
(`apps/token/lib/contracts/market.ts`); la compra no es operativa.

```
1. Conectar wallet (si no está)
2. Buscar token con precio
3. Click [💰 Buy Tokens]
4. Prompt: "How many tokens?" → 10
5. Cálculo: 10 × 0.5 ETH = 5 ETH
6. MetaMask firma
7. ✅ Tokens transferidos
```

**Si no tienes compliance:**
```
❌ Error aparece:

🚫 Compliance Check Failed

You don't meet the compliance requirements for "RET".

📋 Required Claims:
  • KYC - Know Your Customer
  • Accredited Investor
  • Jurisdiction Compliance

💡 What to do:
  1. Go to Identity app (port 4001)
  2. Request required claims from issuers
  3. Wait for approval
  4. Load claims to your identity contract
  5. Try purchasing again
```

#### 6. Transferir Tokens

```
1. Marketplace → Token
2. Click [📤 Transfer Tokens]
3. Prompt: Recipient address
4. Prompt: Amount
5. MetaMask firma
6. ✅ Tokens transferidos

Si recipient no tiene compliance:
❌ Error claro indicando que el recipient necesita claims
```

#### 7. Cambiar de Cuenta

**Método A - Botón:**
```
Click [🔄 Switch Account]
MetaMask muestra cuentas
Selecciona otra
✅ UI actualiza automáticamente
```

**Método B - MetaMask:**
```
Abre MetaMask
Cambia cuenta directamente
✅ UI detecta y actualiza automáticamente
```

---

## 🔄 Flujo Completo de Uso

### Escenario: Investor Compra Token

#### Paso 1: Crear Identidad (Identity App)

```
Usuario: Investor (0x70997...)

1. http://localhost:4001
2. Conectar MetaMask con cuenta del investor
3. Click "Deploy Identity Contract"
4. Firmar transacción
5. ✅ Identidad creada: 0xABC123...
```

#### Paso 2: Solicitar Claims (Identity App)

```
1. Sección "Request Claims"
2. Seleccionar issuer: 0x3C44... (ejemplo)
3. Seleccionar claim: "KYC - Know Your Customer"
4. Mensaje: "I need KYC for investment"
5. Adjuntar: passport.pdf
6. Click "Submit Request"
7. ✅ Request guardado con firma digital
```

**Repetir para otros claims:**
- Accredited Investor (Topic 7)
- Jurisdiction Compliance (Topic 9)

#### Paso 3: Issuer Aprueba (Registry App)

```
Issuer: Trusted Issuer (0x3C44...)

1. http://localhost:4002
2. Conectar MetaMask con cuenta del issuer
3. Ver "Issuer Panel" con pending requests
4. Click en request del investor
5. Leer detalles y documento
6. Escribir nota: "KYC verified successfully"
7. Click [Approve]
8. Firmar decisión en MetaMask
9. ✅ Request aprobado con firma del issuer
```

#### Paso 4: Cargar Claims (Identity App)

```
Usuario: Investor (0x70997...)

1. Volver a http://localhost:4001
2. Ver requests aprobados (badge verde)
3. Click [⬆️ Add Claim to Identity Contract]
4. MetaMask solicita firma
5. Blockchain: identity.addClaim(topic, issuer, signature, data)
6. ✅ Claim cargado on-chain
7. Aparece en "Account Status"
```

**Repetir para los 3 claims.**

#### Paso 5: Admin Crea Token (Token App)

```
Admin: Token Creator (0xf39Fd...)

1. http://localhost:4003
2. Conectar MetaMask
3. Crear token:
   - Name: "Real Estate Token"
   - Symbol: "RET"
   - Claims: KYC, Accredited, Jurisdiction
4. ✅ Token creado
5. Establecer precio:
   - Click [✏️ Edit]
   - Input: 0.5
   - Click [💾 Save]
6. ✅ Precio: 0.5 ETH
```

#### Paso 6: Investor Compra Token (Marketplace) — ⚠️ LEGACY

> Step pendiente de alinear: la compra usa el ABI legacy de `market.ts` que el contrato
> actual no expone. Hoy el flujo verificado termina en transferencias directas sujetas a
> compliance (ver `RepoTecnico/INFORME_EVALUACION_GUIAS_ESTUDIANTE_V1.md`).

```
Usuario: Investor (0x70997...) - Con claims cargados

1. http://localhost:4003/marketplace
2. Conectar wallet (investor)
3. Buscar "Real Estate Token"
4. Ver precio: 0.5 ETH
5. Click [💰 Buy Tokens]
6. Ingresar cantidad: 10
7. MetaMask firma (compliance check pasa ✅)
8. ✅ 10 RET tokens recibidos
```

#### Paso 7: Investor Transfiere Token

```
1. Marketplace
2. Click [📤 Transfer Tokens]
3. Recipient: 0x15d34... (otro investor con claims)
4. Amount: 5
5. MetaMask firma
6. ✅ 5 RET transferidos
```

---

## 📜 Smart Contracts

### Identity Registry

**Address:** (configurado en cada app)

**Funciones principales:**
```solidity
// Registrar el wallet con su contrato de identidad
function registerIdentity(address wallet, address identity) external;

// Obtener identidad de un usuario
function getIdentity(address wallet) external view returns (address);

// ¿Está registrado?
function isRegistered(address wallet) external view returns (bool);
```

### Trusted Issuers Registry

**Funciones principales:**
```solidity
// Añadir issuer de confianza con sus topics
function addTrustedIssuer(address _issuer, uint256[] memory _claimTopics) external;

// Verificar si es issuer
function isTrustedIssuer(address _issuer) external view returns (bool);

// Ver claim topics que puede emitir un issuer
function getIssuerClaimTopics(address _issuer) external view returns (uint256[] memory);
```

### Identity Contract (Individual)

**Funciones principales:**
```solidity
// Añadir claim (7 argumentos; el issuer firmó EIP-712)
function addClaim(
    uint256 _topic,
    uint256 _scheme,
    address _issuer,
    bytes memory _signature,
    bytes memory _data,
    string memory _uri,
    uint256 _expiresAt
) external;

// Verificar claim (por topic + issuer, no por claimId)
function getClaim(uint256 _topic, address _issuer) external view returns (...);

// Obtener issuers para un topic
function getClaimIssuersForTopic(uint256 _topic) external view returns (address[]);
```

### Token Clone Factory

**Address:** (fuente canónica de ABIs: `../rwa-sc/CHANGELOG_ABIS.md`)

**Funciones principales:**
```solidity
// Crear token clone (gas efficient; ver createToken / createTokenWithRegistries
// y la firma exacta vigente en ../rwa-sc/CHANGELOG_ABIS.md)
function createToken(...) external returns (address token);
```

### Token Cloneable (Individual)

**Funciones principales:**
```solidity
// Añadir módulo de compliance (COMPLIANCE_ROLE)
function addComplianceModule(address _module) external;

// Transferir tokens (sujeta a compliance y verificación de identidad)
function transfer(address to, uint256 amount) external returns (bool);

// Acuñar tokens (AGENT_ROLE)
function mint(address to, uint256 amount) external;

// ¿Pasa este usuario los required claims del token?
function isVerified(address account) external view returns (bool);

// ¿Cumple esta transferencia todas las reglas de compliance?
function canTransfer(address from, address to, uint256 amount) external view returns (bool);

// Pausar el token (administración vía GovernanceMultisig con timelock)
function pause() external;
```

---

## 💾 Base de Datos PostgreSQL

Esquema `rwa` (D-095). El DDL canónico y su espejo viven en `RepoTecnico/base_datos.sql`
(regla D-102: byte a byte con `rwa-sc`). Resumen de las tablas principales:

#### Tabla: `rwa.claim_requests`

```sql
-- Columnas principales (DDL completo en base_datos.sql)
id
requester_address
issuer_address
claim_topic        -- 1=KYC, 7=Accreditation, 9=Jurisdiction
message
document_file_id   -- FK a rwa.document_files (sustituye a GridFS)
signed_message     -- firma EIP-191 del requester
signature
status             -- pending | approved | rejected
reviewed_at / review_note
issuer_signed_message / issuer_signature
created_at / updated_at
```

#### Tabla: `rwa.tokens`

```sql
-- Columnas principales
id, name, symbol, decimals
token_address, admin_address
compliance_modules    -- lista de módulos
required_claims       -- topics requeridos (p. ej. 1, 7, 9)
price                 -- precio para la UI (módulo marketplace legacy)
description, transaction_hash, block_number
created_at / updated_at
```

#### Tabla: `rwa.document_files` (sustituye a GridFS)

- Contenido en `bytea` **cifrado con AES-256-GCM** (clave `KYC_ENCRYPTION_KEY`, fuera de la BD).
- Descarga solo para el propietario o roles autorizados (`/api/download/[fileId]`).

#### Indexer (línea @web)

- `rwa.chain_events`: eventos on-chain copiados por `apps/indexer`
  (claves únicas por `(chain_id, tx_hash, log_index)`).
- `rwa.indexer_state`: punto de reanudación del indexador.

---

## ✍️ Sistema de Firmas Digitales

El sistema usa **tres esquemas** de firma según el propósito (lógica en `packages/shared`):

| Esquema | Quién | Uso |
|---|---|---|
| **EIP-191** (`signMessage`) | Requester | Firmar la solicitud de claim |
| **EIP-712** (`signTypedData`) | Issuer | Firmar el payload tipado del claim que se escribe on-chain |
| **SIWE** (EIP-4361) | Todos | Autenticación de sesión (cookie firmada con `SIWE_SESSION_SECRET`) |

### Firma Dual: Requester + Issuer

#### Firma del Requester (al solicitar claim)

**Mensaje firmado:**
```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266-2024-11-11T10:30:00.000Z
```

**Proceso:**
```javascript
const message = `${requesterAddress}-${new Date().toISOString()}`;
const signature = await signer.signMessage(message);
// La solicitud se guarda junto con su firma en PostgreSQL.
```

**Propósito:**
- ✅ Autenticidad - Verificar que la solicitud es real
- ✅ No repudio - El requester no puede negar haberla hecho
- ✅ Timestamp - Registro del momento exacto

#### Firma del Issuer (al aprobar y cargar el claim on-chain)

El claim que se escribe on-chain se firma con **EIP-712** (mensaje tipado), no con un string
libre: el struct tipado se construye en `packages/shared/src/claims/eip712.ts` con los campos
del claim (`topic`, `scheme`, `issuer`, `data`, `uri`, `expiresAt`, …). El issuer firma con
`signTypedData` (wagmi/viem) y el contrato `IdentityCloneable` valida esa firma antes de
aceptar el claim.

**Propósito:**
- ✅ Autoridad - Verifica que el issuer (trusted issuer de ese topic) autorizó el claim
- ✅ Integridad - Firma tipada vinculada a los datos exactos del claim
- ✅ Vigencia - `expiresAt` limita la validez; el issuer puede revocar (`revoked`)
- ✅ Smart Contract - Usada como `_signature` en `addClaim()`

---

## 🛠️ Troubleshooting

### Problema: "Transfer not compliant"

**Causa:** Usuario/Recipient no tiene los claims requeridos

**Solución:**
1. Ir a Identity app (4001)
2. Solicitar claims al issuer
3. Esperar aprobación
4. Cargar claims al contrato
5. Reintentar compra/transfer

### Problema: "execution reverted" al añadir módulo

**Causas posibles:**
- No eres el owner del token
- Módulo no está desplegado
- Token no soporta addComplianceModule()

**Verificación:**
```bash
# Ver owner del token
cast call <TOKEN_ADDRESS> "owner()(address)" --rpc-url http://localhost:8545

# Ver si módulo existe
cast code <MODULE_ADDRESS> --rpc-url http://localhost:8545
```

### Problema: No veo el Issuer Panel

**Causa:** Tu cuenta no está registrada como trusted issuer

**Solución:**
Verificar en Registry que tu address está en la lista de trusted issuers.

### Problema: No puedo descargar documento

**Causa:** el documento no existe, o la clave de cifrado (`KYC_ENCRYPTION_KEY`) no coincide,
o no tienes permisos (solo el propietario / roles autorizados).

**Verificación:**
```bash
psql "$DATABASE_URL" -c "select id, name from rwa.document_files limit 20;"
```

### Problema: Account no cambia en Marketplace

**Solución:** Ya implementado con listeners automáticos
- Cambiar desde botón [🔄 Switch]
- O cambiar directamente en MetaMask
- UI detecta automáticamente

---

## 📊 Claim Topics (Números)

| Número | Nombre | Descripción |
|--------|--------|-------------|
| **1** | KYC | Know Your Customer - Identidad verificada |
| **7** | Accreditation | Accredited Investor - Capacidad financiera |
| **9** | Jurisdiction | Jurisdiction Compliance - Ubicación geográfica |

---

## 🔐 Seguridad

### Firmas Digitales

- ✅ **Requester firma** (EIP-191) al solicitar claim
- ✅ **Issuer firma** (EIP-712) el claim que se escribe on-chain
- ✅ **Ambas registradas** en PostgreSQL junto a la solicitud
- ✅ **Signature del issuer** usada en smart contract
- ✅ **Documentos cifrados** a reposo (AES-256-GCM) en `rwa.document_files`
- ✅ **Sesiones SIWE**; cero claves privadas en el repo (gate `check-no-private-keys.sh`)

### Compliance

- ✅ **Verificación automática** antes de transfers
- ✅ **Múltiples módulos** para diferentes validaciones
- ✅ **Claims on-chain** inmutables
- ✅ **Trusted issuers** registrados

### Permisos

- ✅ **Solo owner** puede añadir compliance modules
- ✅ **Solo admin** puede establecer precio
- ✅ **Solo issuer** puede aprobar claims
- ✅ **Solo requester** puede ver sus requests

---

## 📝 APIs Importantes

### Identity App (4001)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/claim-requests` | POST | Crear solicitud de claim |
| `/api/claim-requests` | GET | Listar mis solicitudes |
| `/api/upload` | POST | Subir documento cifrado a `rwa.document_files` |
| `/api/download/[fileId]` | GET | Descargar documento |

### Registry App (4002)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/issuer-requests` | GET | Requests para un issuer |
| `/api/update-request` | POST | Aprobar/Rechazar request |
| `/api/download/[fileId]` | GET | Descargar documento |

### Token App (4003)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/tokens` | POST | Crear token |
| `/api/tokens` | GET | Listar tokens |
| `/api/tokens/[tokenId]/price` | POST | Actualizar precio |
| `/api/tokens/[tokenId]/modules` | POST | Gestionar módulos |
| `/api/tokens/[tokenId]/claims` | POST | Gestionar claims |

---

## 🎯 Resumen de Características

### ✨ Implementadas

#### apps/identity:
- ✅ Crear/registrar identidad on-chain
- ✅ Solicitar claims con firma digital
- ✅ Adjuntar documentos (cifrados en PostgreSQL)
- ✅ Ver estado de requests
- ✅ Cargar claims aprobados al contrato
- ✅ Ver account status con claims

#### apps/issuer:
- ✅ Ver trusted issuers
- ✅ Panel de issuer (solo si eres issuer)
- ✅ Ver requests pendientes
- ✅ Aprobar/Rechazar con firma digital
- ✅ Ver firmas de requester e issuer
- ✅ Descargar documentos adjuntos

#### apps/token:
- ✅ Crear tokens con factory (EIP-1167)
- ✅ Añadir múltiples compliance modules
- ✅ Ocultar módulos de UI
- ✅ Gestionar required claims (con botón X)
- ⚠️ Establecer y editar precio (módulo legacy)
- ⚠️ Marketplace para comprar tokens (ABI legacy; compra no operativa)
- ✅ Transferir tokens
- ✅ Cambiar de cuenta (automático)
- ✅ Detección de "Transfer not compliant"
- ✅ Mensajes de error formateados

---

## 🚀 Quick Start

### 1. Iniciar Servicios

```bash
# Terminal 1: PostgreSQL
docker compose up -d      # desde la raíz del monorepo rwa-web

# Terminal 2: Anvil
anvil

# Terminal 3: Aplicaciones
cd rwa-web && ./start-all.sh
```

### 2. Verificar que Todo Funciona

```bash
./check-status.sh
```

Debe mostrar:
- ✅ PostgreSQL (docker compose) en 5432
- ✅ Anvil running  
- ✅ apps/identity on port 4001
- ✅ apps/issuer on port 4002
- ✅ apps/token on port 4003

### 3. Configurar MetaMask

**Red Anvil Local:**
- Network Name: Anvil Local
- RPC URL: http://localhost:8545
- Chain ID: 31337
- Currency: ETH

**Importar Cuentas de Prueba:**
```
Account #0 (Admin):
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1 (Investor 1):
0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2 (Issuer):
0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

### 4. Testing Rápido

```bash
# Cuenta Admin (0xf39F...)
1. http://localhost:4001 → Deploy Identity
2. http://localhost:4003 → Create Token
3. Set price: 0.5 ETH

# Cuenta Investor (0x7099...)
4. Switch account en MetaMask
5. http://localhost:4001 → Deploy Identity
6. Request claims (KYC, Accreditation, Jurisdiction)

# Cuenta Issuer (0x3C44...)
7. Switch account en MetaMask
8. http://localhost:4002 → Approve requests

# Cuenta Investor
9. Switch back to investor
10. http://localhost:4001 → Load approved claims
11. http://localhost:4003/marketplace → Buy tokens ✅
```

---

## 📚 Glosario

- **RWA:** Real World Assets - Activos del mundo real tokenizados
- **Claim:** Certificación on-chain (KYC, Accreditation, etc.)
- **Issuer:** Entidad que emite/certifica claims
- **Compliance:** Verificación de requisitos regulatorios
- **EIP-1167:** Minimal Proxy Pattern - Clones baratos de contratos
- **PostgreSQL:** base de datos relacional del backend (esquema `rwa`); los documentos se
  guardan cifrados en `rwa.document_files`
- **Topic:** Número que identifica un tipo de claim (1, 7, 9, etc.)
- **Factory:** Contrato que crea clones de tokens eficientemente

---

## 🎓 Conceptos Avanzados

### EIP-1167 Minimal Proxy Pattern

Los tokens se crean como "clones" (proxies) que delegan llamadas a un contrato de implementación:

**Ventajas:**
- ⚡ ~98% menos gas (~50k vs ~3M gas)
- 📦 Bytecode tiny (~100 bytes vs ~30KB)
- 🔒 Código auditado compartido
- 💰 Económico para crear muchos tokens

**Cómo funciona:**
```
Clone (50k gas)          Implementation (3M gas)
┌──────────┐            ┌─────────────────┐
│ delegatecall ────────→ │ Toda la lógica │
│ Storage │            │                 │
└──────────┘            └─────────────────┘
```

### Sistema Modular de Compliance

Los tokens pueden tener múltiples módulos de compliance:

```
Token
  └─→ addComplianceModule(Module1)
  └─→ addComplianceModule(Module2)
  └─→ addComplianceModule(Module3)

Cada módulo verifica diferentes aspectos:
• Module 1: KYC verification
• Module 2: Jurisdiction limits
• Module 3: Accreditation status
```

---

## 🔍 Comandos Útiles (Cast)

### Verificar Identidad

```bash
# Ver si usuario tiene identidad
cast call <IDENTITY_REGISTRY> \
  "identity(address)(address)" <USER_ADDRESS> \
  --rpc-url http://localhost:8545
```

### Verificar Issuer

```bash
# Ver si es trusted issuer
cast call <TRUSTED_REGISTRY> \
  "isTrustedIssuer(address)(bool)" <ISSUER_ADDRESS> \
  --rpc-url http://localhost:8545
```

### Verificar Token

```bash
# Ver compliance del token
cast call <TOKEN_ADDRESS> \
  "aggregator()(address)" \
  --rpc-url http://localhost:8545

# Ver owner
cast call <TOKEN_ADDRESS> \
  "owner()(address)" \
  --rpc-url http://localhost:8545

# Ver balance
cast call <TOKEN_ADDRESS> \
  "balanceOf(address)(uint256)" <USER_ADDRESS> \
  --rpc-url http://localhost:8545
```

---

## 📖 Lecturas Adicionales

- **EIP-1167:** https://eips.ethereum.org/EIPS/eip-1167
- **ERC-735:** Identity Claims (base de este proyecto)
- **wagmi:** https://wagmi.sh
- **viem:** https://viem.sh

---

## 🎉 Conclusión

Has aprendido:

✅ **Identidades on-chain** - Sistema descentralizado de identidad  
✅ **Claims verificables** - KYC, Accreditation, Jurisdiction  
✅ **Firmas digitales** - Autenticidad y no repudio  
✅ **Tokens RWA** - Con compliance automático  
✅ **Factory pattern** - EIP-1167 para gas efficiency  
✅ **Marketplace** - Compra/venta de tokens  
✅ **Compliance checks** - Verificación automática  
✅ **PostgreSQL + AES-256-GCM** - Almacenamiento de datos y documentos cifrados  
✅ **Indexer off-chain** - Eventos on-chain copiados a PostgreSQL  

---

**Versión:** 2.1.0 (actualizada al estado real del monorepo)  
**Fecha:** 28 de Octubre, 2026  
**Autor:** Línea @web (rwa-web) — para el detalle de ABIs: `../rwa-sc/CHANGELOG_ABIS.md`  

🎓 **¡Buen aprendizaje!** 🚀

