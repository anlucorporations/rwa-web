# RegistryChain - Trusted Issuers & Claim Topics Registry

A professional Web3 application for managing trusted issuers and claim topics on the blockchain using Ethereum smart contracts. Built with Next.js 16, React 19, Viem, and MetaMask integration.

## Features

- **Professional Landing Page**: Modern, dark-themed UI with elegant design
- **Registry Dashboard**: View all registered issuers and claim topics
- **Register Issuers**: Add new trusted issuers (owner-only)
- **Register Claim Topics**: Add new claim topics (owner-only)
- **MetaMask Integration**: Connect your wallet to interact with contracts
- **Real-time Data**: Auto-refreshing registry data
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Web3**: Viem, Wagmi, RainbowKit
- **Blockchain**: Ethereum, Anvil (local)
- **Contracts**: Solidity (TrustedIssuersRegistry2, ClaimTopicsRegistry2)

## Prerequisites

- Node.js 18+ and npm
- MetaMask browser extension
- Anvil running locally on port 8545 with the contracts deployed

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Anvil

Make sure Anvil is running with the contracts deployed:

```bash
anvil
# Deploy contracts in separate terminal
cd ../rwa-sc/sc
forge script script/DeployRegistries2.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6c1f02960247590b80 --broadcast
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── page.tsx                 # Landing page
├── dashboard/
│   └── page.tsx            # Registry dashboard
├── register-issuer/
│   └── page.tsx            # Issuer registration form
├── register-claim-topic/
│   └── page.tsx            # Claim topic registration form
├── globals.css             # Global styles and animations
└── layout.tsx              # Root layout

lib/
├── abi/
│   ├── TrustedIssuersRegistry2.ts
│   └── ClaimTopicsRegistry2.ts
├── contracts.ts            # Contract addresses and configs
├── contractCalls.ts        # Contract interaction functions
├── types.ts                # TypeScript types
└── web3.ts                 # Viem client setup
```

## Usage

### Connecting Your Wallet

1. Click "Connect Wallet" button on the landing page
2. MetaMask will prompt you to approve the connection
3. The app will automatically switch to the Anvil network (if needed)

### Viewing the Registry

1. Go to the Dashboard (click "Dashboard" in navigation)
2. See the total number of registered issuers and claim topics
3. View all registered issuers and claim topics in the lists

### Registering an Issuer (Owner Only)

1. Click "Register Issuer" in navigation
2. Connect your MetaMask wallet with the owner account
3. Fill in the issuer address and name
4. Click "Register Issuer" to submit the transaction

### Registering a Claim Topic (Owner Only)

1. Click "Register Topic" in navigation
2. Connect your MetaMask wallet with the owner account
3. Fill in the topic ID (must be > 0) and name
4. Click "Register Claim Topic" to submit the transaction

## Contract Addresses (Anvil Local)

- **TrustedIssuersRegistry2**: `0x5fbdb2315678afecb367f032d93f642f64180aa3`
- **ClaimTopicsRegistry2**: `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`
- **Owner Account**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

## Available Routes

- `/` - Landing page
- `/dashboard` - Registry dashboard with statistics and listings
- `/register-issuer` - Form to register new trusted issuers
- `/register-claim-topic` - Form to register new claim topics

## Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Lint code
npm run lint
```

## Design System

The app features a luxury minimalism aesthetic with:
- **Typography**: Playfair Display (headings), Lato (body)
- **Colors**: Dark background (#0a0a0a) with cyan/blue accents (#00d9ff, #0066ff)
- **Animations**: Staggered entrance animations and smooth transitions
- **Effects**: Glow effects, gradient backgrounds, and subtle textures

## Error Handling

- MetaMask not installed: Shows installation prompt
- Wrong network: Automatically prompts to switch to Anvil
- Permission denied: User must approve MetaMask connection
- Contract errors: Displays user-friendly error messages

## License

MIT
