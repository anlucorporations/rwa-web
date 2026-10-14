# 🏦 RWA Web Platform - Complete Ecosystem

A complete decentralized platform for Real World Asset (RWA) tokenization with identity management, claim verification, and compliant token creation.

## 🎯 Platform Overview

This platform consists of **3 integrated web applications**:

| Application | Port | Description | Target Users |
|------------|------|-------------|--------------|
| **web-identity** | 4001 | Identity & Claim Management | End Users / Investors |
| **web-registry-trusted** | 4002 | Issuer Panel & Claim Approval | Trusted Issuers |
| **web-token** | 4003 | Token Factory & Management | Token Creators |

---

## 🚀 Quick Start - Launch Everything

### One-Command Startup

```bash
# Start all 3 applications
./start-all.sh
```

This will:
- ✅ Kill any existing processes on ports 4001, 4002, 4003
- ✅ Start web-identity on port 4001
- ✅ Start web-registry-trusted on port 4002
- ✅ Start web-token on port 4003
- ✅ Create logs in `logs/` directory
- ✅ Verify all servers are running

### Stop Everything

```bash
./stop-all.sh
```

---

## 📱 Applications

### 1. web-identity (Port 4001)
**For End Users / Investors**

Features:
- Create and register on-chain identities
- Request claims from trusted issuers
- Upload supporting documents to MongoDB
- Track claim request status
- Digital signature verification

**URL:** http://localhost:4001

### 2. web-registry-trusted (Port 4002)
**For Trusted Issuers**

Features:
- Add/manage trusted issuers (owner only)
- View claim requests from users
- Approve or reject claim requests
- Download user documents from MongoDB
- Add review notes

**URL:** http://localhost:4002

### 3. web-token (Port 4003)
**For Token Creators**

Features:
- Create RWA tokens with EIP-1167 clone pattern
- Define required investor claims (KYC, Accreditation, Jurisdiction)
- Set compliance aggregator automatically
- View all created tokens
- MongoDB storage for token registry

**URL:** http://localhost:4003

---

## 🏗️ System Architecture

This system implements a comprehensive RWA platform:

1. **IdentityCloneFactory** (`0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`)
   - Creates identity contracts using EIP-1167 minimal proxy pattern
   - Anyone can create an identity for themselves
   - Gas-efficient: ~45k gas vs ~800k for full deployment

2. **IdentityRegistry** (`0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`)
   - Centralized registry mapping wallet addresses to identity contracts
   - **Self-registration enabled**: Users can register their own identities
   - Used for tracking and managing identity contracts

---

## 📋 Prerequisites

### Required Services

1. **MongoDB** - Database for claims, tokens, and documents
   ```bash
   brew services start mongodb-community
   ```

2. **Anvil** - Local Ethereum node
   ```bash
   anvil
   ```

3. **MetaMask** - Browser wallet extension

4. **Node.js** - Runtime environment
   ```bash
   node --version  # Should be v18+
   npm --version
   ```

---

## 🎬 Complete Setup

### Step 1: Install Dependencies

```bash
# Install for all applications
cd web-identity && npm install && cd ..
cd web-registry-trusted && npm install && cd ..
cd web-token && npm install && cd ..
```

### Step 2: Start Services

```bash
# Terminal 1: MongoDB
brew services start mongodb-community

# Terminal 2: Anvil (keep this running)
anvil

# Terminal 3: All Web Apps
./start-all.sh
```

### Step 3: Access Applications

- 🌐 **Identity Management**: http://localhost:4001
- 🎫 **Issuer Panel**: http://localhost:4002
- 🪙 **Token Factory**: http://localhost:4003

## Usage

1. **Connect Wallet**: Click "Connect Wallet" and authorize CodeCrypto/MetaMask
2. **Create Identity**: Click "Create Identity" to deploy and register your identity
   - This will create two transactions:
     - Transaction 1: Create identity contract (via IdentityCloneFactory)
     - Transaction 2: Register identity in registry (via IdentityRegistry)
3. **Status**: Once completed, your identity will show as "Registered" ✅

## Test Accounts (Anvil Default)

| Role | Address | Private Key |
|------|---------|-------------|
| Admin/Owner | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| User 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| User 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

## Redeploying Contracts

If you restart Anvil, you'll need to redeploy the contracts:

```bash
cd ../56_RWA_SC/sc

# Deploy IdentityCloneFactory
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
forge script script/DeployIdentityCloneFactory.s.sol:DeployIdentityCloneFactory \
  --rpc-url http://localhost:8545 \
  --broadcast

# Deploy IdentityRegistry
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
forge script script/DeployIdentityRegistry.s.sol:DeployIdentityRegistry \
  --rpc-url http://localhost:8545 \
  --broadcast
```

Then update the addresses in:
- `smart_contract.txt`
- `web/lib/contracts.ts`

## Contract Addresses

Current deployment on Anvil (Chain ID: 31337):

```
IdentityRegistry=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
IdentityFactory=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Implementation=0x75537828f2ce51be7289709686A69CbFDbB714F1
```

## Troubleshooting

### "Missing revert data" error
- **Cause**: Contracts don't exist at the specified addresses (Anvil was restarted)
- **Solution**: Redeploy contracts (see above) and update addresses

### Wallet won't connect
- **Check**: Anvil is running on `http://localhost:8545`
- **Check**: Add Anvil network in wallet settings (Chain ID: 31337, RPC: http://localhost:8545)
- **Try**: Refresh the page and reconnect

## Architecture Notes

### Why Two Contracts?

**IdentityCloneFactory**:
- Permissionless - anyone can create identities
- Gas-efficient using EIP-1167 clones (~94% gas savings)
- Users maintain full ownership of their identity contracts
- Creates minimal proxy clones pointing to a single implementation

**IdentityRegistry**:
- Central registry mapping wallet addresses to identity contracts
- Self-registration enabled - users can register their own identities
- Provides a lookup service for finding identity contracts
- Can be queried by other contracts or dApps

This design separates **identity creation** (via factory) from **identity tracking** (via registry), providing flexibility and gas efficiency while maintaining a centralized lookup service.

## 💾 Database Structure (MongoDB)

### Database: `rwa`

**Collections:**
- `claim_requests` - User claim requests with signatures
- `claim_documents.files` - Document metadata (GridFS)
- `claim_documents.chunks` - Document data (GridFS)
- `tokens` - Created RWA tokens registry

---

## 🔐 Security Features

- ✅ **Digital Signatures**: All claim requests are cryptographically signed
- ✅ **Document Storage**: Files stored in MongoDB GridFS (not filesystem)
- ✅ **Compliance Checks**: Automated investor verification via claims
- ✅ **Authorization**: Issuers can only approve their own requests
- ✅ **Non-Repudiation**: Signatures prove authenticity

---

## 📚 Documentation

### Frontend optimization stage (`RepoTecnico/`)
- [`RepoTecnico/README.md`](RepoTecnico/README.md) - Index of the `@web` development line documentation
- [`RepoTecnico/INFORME_OPTIMIZACION_WEB_V1.md`](RepoTecnico/INFORME_OPTIMIZACION_WEB_V1.md) - Frontend audit (16 findings)
- [`RepoTecnico/requerimientos_web.md`](RepoTecnico/requerimientos_web.md) - Web requirements (RF-W / RNF-W / RT-W)
- [`RepoTecnico/plan_desarrollo_web.md`](RepoTecnico/plan_desarrollo_web.md) - Vertical plan (cycles O0…O5)
- [`RepoTecnico/pruebas/verificacion_gcp_o0.md`](RepoTecnico/pruebas/verificacion_gcp_o0.md) - GCP services verification (cycle O0)

### General
- `SCRIPTS_README.md` - Script usage and management
- `FIRMA_DIGITAL.md` - Digital signature system

### web-identity
- `CLAIM_REQUESTS_README.md` - Claim request system
- `TESTING_GUIDE.md` - Testing and debugging

### web-registry-trusted
- `ISSUER_PANEL_README.md` - Issuer panel features
- `INTERFAZ_ISSUER.md` - UI/UX guide
- `DONDE_ESTA_EL_FORMULARIO.md` - Where to find features

### web-token
- `TOKEN_MANAGEMENT_README.md` - Token management system
- `DEBUGGING_MONGODB.md` - MongoDB troubleshooting

---

## 🧪 Testing Flow

### Complete User Journey

1. **Create Identity** (web-identity:4001)
   - Connect wallet → Create identity → Register

2. **Request Claim** (web-identity:4001)
   - Select issuer → Select claim topic → Upload document → Sign & Submit

3. **Approve Claim** (web-registry-trusted:4002)
   - Connect as issuer → View requests → Review details → Approve/Reject

4. **Create Token** (web-token:4003)
   - Connect wallet → Fill form → Select required claims → Create
   - Token automatically set with compliance aggregator

---

## 🔧 Useful Commands

```bash
# Start everything
./start-all.sh

# Stop everything
./stop-all.sh

# View logs
tail -f logs/*.log

# Check MongoDB
mongosh --eval "use rwa; db.getCollectionNames()"

# Check running ports
lsof -i :4001,4002,4003

# Restart a specific app
# Stop it
lsof -ti:4001 | xargs kill -9
# Start it
cd web-identity && npm run dev -- -p 4001
```

---

## 🎯 Claim Topics

| ID | Name | Description | Required For |
|----|------|-------------|--------------|
| **1** | KYC | Know Your Customer | 🪙 Token Investment |
| **7** | Accreditation | Accredited Investor | 🪙 Token Investment |
| **9** | Jurisdiction | Geographic Compliance | 🪙 Token Investment |

---

## 🌐 Technology Stack

- **Smart Contracts**: Solidity 0.8.20, OpenZeppelin, Foundry
- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS v4
- **Blockchain**: Ethereum (local Anvil testnet)
- **Database**: MongoDB (native driver, no Mongoose)
- **File Storage**: MongoDB GridFS
- **Web3**: ethers.js v6
- **Wallet**: MetaMask

---

## 📦 Repository Structure

```
57_RWA_WEB/
├── start-all.sh                    # Launch all apps
├── stop-all.sh                     # Stop all apps
├── web-identity/                   # User identity & claims
├── web-registry-trusted/           # Issuer panel
├── web-token/                      # Token factory
├── logs/                           # Application logs
└── .pids/                          # Process IDs
```

---

## 🤝 Contributing

See individual app READMEs for specific contribution guidelines.

## 📄 License

MIT

