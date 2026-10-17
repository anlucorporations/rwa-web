# TokenCloneFactory Web Application

This is a [Next.js](https://nextjs.org) web application for interacting with the **TokenCloneFactory** smart contract.

## Smart Contract Information

- **Contract**: TokenCloneFactory
- **Factory Address**: `0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519`
- **Implementation Address**: `0xC7f2Cf4845C6db0e1a1e91ED41Bcd0FcC1b0E141`
- **Network**: Anvil Local (Chain ID: 31337)
- **Owner**: `0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38`

The contract ABI and configuration are available in `lib/contracts/TokenCloneFactory.ts`.

## What is TokenCloneFactory?

TokenCloneFactory uses the **EIP-1167 Minimal Proxy Pattern** to create token clones with massive gas savings:

- ⚡ **Clone Deployment**: ~50k gas
- 💰 **Full Deployment**: ~3M gas
- 🎉 **Savings**: ~2.95M gas per Token (98.3% reduction!)

This means you can deploy hundreds of tokens for the cost of deploying just one traditional token!

## Prerequisites

Before running the application, make sure you have:

1. **Anvil running** on `http://localhost:8545`
   ```bash
   anvil
   ```

2. The **TokenCloneFactory contract deployed** at the address above
   - If you need to redeploy, update the address in `lib/contracts/TokenCloneFactory.ts`

3. **Node.js** (v18 or higher) and **npm** installed

4. **MetaMask** or another Web3 wallet (to create tokens)

## Getting Started

First, install the dependencies:

```bash
npm install
```

Install ethers.js for Web3 interactions:

```bash
npm install ethers
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

```
web-token/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main page component
│   └── layout.tsx         # Root layout
├── lib/                   # Library code
│   ├── contracts/         # Smart contract configurations
│   │   ├── TokenCloneFactory.ts  # Contract ABI & addresses
│   │   ├── index.ts       # Exports
│   │   └── README.md      # Contract documentation
│   └── examples/          # Example components
│       └── TokenFactoryExample.tsx  # Factory UI example
└── public/                # Static assets
```

## Using the Contract in Your Components

### Import the contract configuration

```typescript
import {
  TOKEN_CLONE_FACTORY_ADDRESS,
  TOKEN_IMPLEMENTATION_ADDRESS,
  TOKEN_CLONE_FACTORY_ABI,
  NETWORK_CONFIG,
  FACTORY_OWNER,
  GAS_SAVINGS,
} from '@/lib/contracts';
```

### Example: Reading contract data

```typescript
import { ethers } from 'ethers';
import { TOKEN_CLONE_FACTORY_ADDRESS, TOKEN_CLONE_FACTORY_ABI } from '@/lib/contracts';

const provider = new ethers.JsonRpcProvider('http://localhost:8545');
const factory = new ethers.Contract(
  TOKEN_CLONE_FACTORY_ADDRESS,
  TOKEN_CLONE_FACTORY_ABI,
  provider
);

// Get total tokens created
const totalTokens = await factory.getTotalTokens();
console.log('Total Tokens:', totalTokens.toString());

// Get tokens for a specific admin
const tokens = await factory.getTokensByAdmin('0x...');
console.log('Admin Tokens:', tokens);
```

### Example: Creating a new token

```typescript
import { ethers } from 'ethers';
import { TOKEN_CLONE_FACTORY_ADDRESS, TOKEN_CLONE_FACTORY_ABI } from '@/lib/contracts';

// Connect with MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const factory = new ethers.Contract(
  TOKEN_CLONE_FACTORY_ADDRESS,
  TOKEN_CLONE_FACTORY_ABI,
  signer
);

// Create a new token
const tx = await factory.createToken(
  "My Security Token",     // name
  "MST",                   // symbol
  18,                      // decimals
  await signer.getAddress() // admin
);

const receipt = await tx.wait();
console.log('Token created!', receipt);
```

See `lib/contracts/README.md` for more examples using different libraries (ethers, viem, wagmi).

## Features

### Token Creation
- Create new security tokens with just a few clicks
- Extremely low gas costs (~50k gas vs ~3M gas)
- Automatic admin role assignment
- Support for creating tokens with registries pre-configured

### Token Management
- View all created tokens
- Filter tokens by admin
- Track total number of tokens
- Access implementation contract details

### Gas Optimization
- Uses EIP-1167 minimal proxy pattern
- 98.3% gas savings compared to full deployments
- Perfect for deploying multiple similar tokens

## Example Component

To use the example component:

```typescript
// In your app/page.tsx
import TokenFactoryExample from '@/lib/examples/TokenFactoryExample';

export default function Home() {
  return <TokenFactoryExample />;
}
```

## Learn More

To learn more about Next.js and the technologies used:

- **Next.js Documentation**: https://nextjs.org/docs
- **ethers.js Documentation**: https://docs.ethers.org/v6/
- **EIP-1167 (Minimal Proxy)**: https://eips.ethereum.org/EIPS/eip-1167
- **Contract Documentation**: See `lib/contracts/README.md`

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Additional Documentation

- **Quick Start Guide**: `QUICK_START.md` (coming soon)
- **Deployment Info**: `DEPLOYMENT_INFO.md` (coming soon)
- **Contract API**: `lib/contracts/README.md`

## Support

For issues or questions:
1. Check the `lib/contracts/README.md` for contract documentation
2. Review the example component in `lib/examples/TokenFactoryExample.tsx`
3. Ensure Anvil is running and contracts are deployed
4. Verify MetaMask is connected to the Anvil network (Chain ID: 31337)
