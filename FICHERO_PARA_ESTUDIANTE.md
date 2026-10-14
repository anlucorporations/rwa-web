# 📚 Guía Completa - Plataforma RWA (Real World Assets)

**Para Estudiantes y Desarrolladores**

---

## 📖 Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Configuración e Instalación](#configuración-e-instalación)
4. [Aplicación 1: Identity (Puerto 4001)](#aplicación-1-identity)
5. [Aplicación 2: Registry Trusted (Puerto 4002)](#aplicación-2-registry-trusted)
6. [Aplicación 3: Token Factory & Marketplace (Puerto 4003)](#aplicación-3-token-factory)
7. [Flujo Completo de Uso](#flujo-completo-de-uso)
8. [Smart Contracts](#smart-contracts)
9. [Base de Datos MongoDB](#base-de-datos-mongodb)
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
RWA Platform
│
├── web-identity (Puerto 4001)
│   ├── Crear identidad on-chain
│   ├── Solicitar claims a issuers
│   └── Cargar claims aprobados al contrato
│
├── web-registry-trusted (Puerto 4002)
│   ├── Ver issuers de confianza
│   ├── Aprobar/Rechazar claim requests
│   └── Firmar digitalmente las decisiones
│
└── web-token (Puerto 4003)
    ├── Crear tokens RWA con factory
    ├── Gestionar compliance modules
    ├── Establecer precios
    └── Marketplace para comprar/transferir
```

### Stack Tecnológico

- **Frontend:** Next.js 16, React, TypeScript, TailwindCSS
- **Blockchain:** Ethereum (Anvil local), ethers.js v6
- **Base de Datos:** MongoDB (nativo, sin Mongoose)
- **Storage:** GridFS para documentos
- **Wallets:** MetaMask

---

## ⚙️ Configuración e Instalación

### Requisitos Previos

```bash
# Node.js v18+
node --version

# MongoDB
mongod --version

# Anvil (Foundry)
anvil --version
```

### Instalación

```bash
# 1. Clonar/navegar al proyecto
cd "57_RWA_WEB"

# 2. Instalar dependencias en cada app
cd web-identity && npm install
cd ../web-registry-trusted && npm install
cd ../web-token && npm install

# 3. Iniciar MongoDB (en otra terminal)
mongod

# 4. Iniciar Anvil (en otra terminal)
anvil

# 5. Iniciar todas las apps
cd ..
./start-all.sh
```

### Puertos Asignados

| Aplicación | Puerto | URL |
|------------|--------|-----|
| **web-identity** | 4001 | http://localhost:4001 |
| **web-registry-trusted** | 4002 | http://localhost:4002 |
| **web-token** | 4003 | http://localhost:4003 |

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
1. Conectar MetaMask
2. Click "Deploy Identity Contract"
3. Firmar transacción
4. ✅ Identidad creada on-chain
```

**Resultado:** Contrato de identidad desplegado con tu address como owner.

#### 2. Solicitar Claim a un Issuer

```
1. Sección "Request Claims from Issuers"
2. Seleccionar issuer de la lista
3. Seleccionar tipo de claim (KYC, Accreditation, Jurisdiction)
4. Escribir mensaje explicativo
5. Adjuntar documento (opcional)
6. Sistema firma digitalmente (requester + fecha)
7. Click "Submit Request"
8. ✅ Request guardado en MongoDB
```

**Datos guardados:**
- Requester address
- Issuer address
- Claim topic
- Mensaje
- Documento (GridFS)
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
3. Sistema llama a identity.addClaim() con:
   - Claim topic
   - Issuer address
   - Signature del issuer
   - Data (mensaje, fecha, etc.)
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
7. ✅ Guardado en MongoDB
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
6. MongoDB: Añade a array complianceModules
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

#### 4. Establecer Precio

```
1. Token card → "Price per Token: Not set"
2. Click [✏️ Edit]
3. Input aparece: [0.5] ETH
4. Cambiar valor
5. Click [💾 Save]
6. MongoDB actualizado
7. ✅ Precio visible en Marketplace
```

#### 5. Marketplace - Comprar Tokens

**Navegar a Marketplace:**
```
Factory → Click [🏪 Marketplace]
O visitar: http://localhost:4003/marketplace
```

**Comprar Token:**
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

#### Paso 6: Investor Compra Token (Marketplace)

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
// Desplegar identidad para un usuario
function deployIdentity(address _user) external returns (address);

// Obtener identidad de un usuario
function identity(address _user) external view returns (address);
```

### Trusted Issuers Registry

**Funciones principales:**
```solidity
// Ver issuers de confianza
function getTrustedIssuers() external view returns (address[]);

// Verificar si es issuer
function isTrustedIssuer(address _issuer) external view returns (bool);

// Ver claim topics que puede emitir un issuer
function getTrustedIssuerClaimTopics(address _issuer) external view returns (uint256[]);
```

### Identity Contract (Individual)

**Funciones principales:**
```solidity
// Añadir claim
function addClaim(
    uint256 _topic,
    uint256 _scheme,
    address _issuer,
    bytes _signature,
    bytes _data,
    string _uri
) external returns (bytes32);

// Verificar claim
function getClaim(bytes32 _claimId) external view returns (...);

// Obtener issuers para un topic
function getClaimIssuersForTopic(uint256 _topic) external view returns (address[]);
```

### Token Clone Factory

**Address:** (ver DEPLOYMENT_INFO.md)

**Funciones principales:**
```solidity
// Crear token clone (gas efficient)
function createToken(
    string name_,
    string symbol_,
    uint8 decimals_,
    address admin
) external returns (address token);

// Ver total de tokens
function getTotalTokens() external view returns (uint256);

// Ver tokens de un admin
function getTokensByAdmin(address admin) external view returns (address[]);
```

### Token Cloneable (Individual)

**Funciones principales:**
```solidity
// Añadir módulo de compliance
function addComplianceModule(address _module) external;

// Transferir tokens
function transfer(address to, uint256 amount) external returns (bool);

// Acuñar tokens (AGENT_ROLE)
function mint(address to, uint256 amount) external;

// Ver compliance actual
function compliance() external view returns (address);
```

---

## 💾 Base de Datos MongoDB

### Database: `rwa`

#### Colección: `claim_requests`

```javascript
{
  _id: ObjectId("..."),
  requesterAddress: "0xf39Fd6...",
  issuerAddress: "0x3C44cF...",
  claimTopic: 1,  // 1=KYC, 7=Accreditation, 9=Jurisdiction
  message: "I need KYC verification...",
  
  // Documento adjunto (GridFS)
  documentFileId: ObjectId("..."),
  documentName: "passport.pdf",
  documentContentType: "application/pdf",
  documentSize: 524288,
  
  // Firma digital del requester
  signedMessage: "0xf39Fd6...2266-2024-11-11T10:30:00",
  signature: "0xabc123def456...",
  
  // Estado y revisión
  status: "approved",  // pending | approved | rejected
  reviewedAt: ISODate("..."),
  reviewNote: "KYC verified successfully",
  
  // Firma digital del issuer
  issuerSignedMessage: "Request:abc123|Issuer:0x3C44|Decision:approved...",
  issuerSignature: "0xdef456abc789...",
  
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

#### Colección: `tokens`

```javascript
{
  _id: ObjectId("..."),
  name: "Real Estate Token",
  symbol: "RET",
  decimals: 18,
  
  tokenAddress: "0x1234567890...",
  adminAddress: "0xf39Fd6...",
  
  // Compliance
  complianceModules: [
    "0x5b73c5498c1e3b4dba84de0f1833c4a029d90519",
    "0x90193c961a926261b756d1e5bb255e67ff9498a1"
  ],
  complianceAddress: "0x5b73c5...",  // Primer módulo
  
  // Claims requeridos
  requiredClaims: [1, 7, 9],
  
  // Precio
  price: 0.5,  // ETH por token
  
  description: "Tokenized real estate...",
  transactionHash: "0xabc...",
  blockNumber: 12345,
  
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

#### GridFS Buckets

**claim_documents:** Almacena documentos adjuntos a claims

```javascript
// fs.files
{
  _id: ObjectId("..."),
  filename: "passport.pdf",
  contentType: "application/pdf",
  length: 524288,
  uploadDate: ISODate("...")
}

// fs.chunks (binario)
{
  files_id: ObjectId("..."),
  n: 0,
  data: Binary(...)
}
```

---

## ✍️ Sistema de Firmas Digitales

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

// Guardado en MongoDB:
{
  signedMessage: "0xf39F...-2024-11-11T10:30:00",
  signature: "0xabc123..."
}
```

**Propósito:**
- ✅ Autenticidad - Verificar que la solicitud es real
- ✅ No repudio - El requester no puede negar haberla hecho
- ✅ Timestamp - Registro del momento exacto

#### Firma del Issuer (al aprobar/rechazar)

**Mensaje firmado:**
```
Request:abc123def456|Issuer:0x3C44cF887c6...|Requester:0xf39Fd6...|Topic:1|Decision:approved|Timestamp:2024-11-11T11:00:00|Note:KYC verified
```

**Proceso:**
```javascript
const message = 
  `Request:${requestId}` +
  `|Issuer:${issuerAddress}` +
  `|Requester:${requesterAddress}` +
  `|Topic:${claimTopic}` +
  `|Decision:${decision}` +
  `|Timestamp:${timestamp}` +
  `|Note:${reviewNote}`;

const signature = await signer.signMessage(message);
```

**Propósito:**
- ✅ Autoridad - Verifica que el issuer autorizó la decisión
- ✅ Integridad - Incluye todos los datos de la decisión
- ✅ Auditoría - Registro inmutable de la aprobación
- ✅ Smart Contract - Usada como _signature en addClaim()

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

**Causa:** GridFS no encuentra el archivo

**Verificación:**
```javascript
mongosh
> use rwa
> db.claim_documents.files.find()
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

- ✅ **Requester firma** al solicitar claim
- ✅ **Issuer firma** al aprobar/rechazar
- ✅ **Ambas guardadas** en MongoDB
- ✅ **Signature del issuer** usada en smart contract

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
| `/api/upload` | POST | Subir documento a GridFS |
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
| `/api/tokens/[id]/price` | POST | Actualizar precio |
| `/api/tokens/[id]/modules` | POST | Gestionar módulos |
| `/api/tokens/[id]/claims` | POST | Gestionar claims |

---

## 🎯 Resumen de Características

### ✨ Implementadas

#### web-identity:
- ✅ Desplegar identidad on-chain
- ✅ Solicitar claims con firma digital
- ✅ Adjuntar documentos (GridFS)
- ✅ Ver estado de requests
- ✅ Cargar claims aprobados al contrato
- ✅ Ver account status con claims

#### web-registry-trusted:
- ✅ Ver trusted issuers
- ✅ Panel de issuer (solo si eres issuer)
- ✅ Ver requests pendientes
- ✅ Aprobar/Rechazar con firma digital
- ✅ Ver firmas de requester e issuer
- ✅ Descargar documentos adjuntos

#### web-token:
- ✅ Crear tokens con factory (EIP-1167)
- ✅ Añadir múltiples compliance modules
- ✅ Ocultar módulos de UI
- ✅ Gestionar required claims (con botón X)
- ✅ Establecer y editar precio
- ✅ Marketplace para comprar tokens
- ✅ Transferir tokens
- ✅ Cambiar de cuenta (automático)
- ✅ Detección de "Transfer not compliant"
- ✅ Mensajes de error formateados

---

## 🚀 Quick Start

### 1. Iniciar Servicios

```bash
# Terminal 1: MongoDB
mongod

# Terminal 2: Anvil
anvil

# Terminal 3: Aplicaciones
cd "57_RWA_WEB"
./start-all.sh
```

### 2. Verificar que Todo Funciona

```bash
./check-status.sh
```

Debe mostrar:
- ✅ MongoDB running
- ✅ Anvil running  
- ✅ web-identity on port 4001
- ✅ web-registry-trusted on port 4002
- ✅ web-token on port 4003

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
- **GridFS:** Sistema de almacenamiento de archivos en MongoDB
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
  "compliance()(address)" \
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
- **GridFS:** https://www.mongodb.com/docs/manual/core/gridfs/
- **ethers.js:** https://docs.ethers.org/v6/

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
✅ **MongoDB + GridFS** - Almacenamiento de datos y archivos  

---

**Versión:** 2.0.0  
**Fecha:** 11 de Noviembre, 2024  
**Autor:** Sistema RWA Platform  

🎓 **¡Buen aprendizaje!** 🚀

