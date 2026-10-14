# TrustedIssuersRegistry Web Application

This is a [Next.js](https://nextjs.org) web application for interacting with the **TrustedIssuersRegistry** smart contract.

## Smart Contract Information

- **Contract**: TrustedIssuersRegistry
- **Address**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- **Network**: Anvil Local (Chain ID: 31337)
- **Owner**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

The contract ABI and configuration are available in `lib/contracts/TrustedIssuersRegistry.ts`.

## Prerequisites

Before running the application, make sure you have:

1. **Anvil running** on `http://localhost:8545`
   ```bash
   anvil
   ```

2. The **TrustedIssuersRegistry contract deployed** at the address above
   - If you need to redeploy, update the address in `lib/contracts/TrustedIssuersRegistry.ts`

3. **Node.js** (v18 or higher) and **npm** installed

## Getting Started

First, install the dependencies:

```bash
npm install
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
web-registry-trusted/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main page component
│   └── layout.tsx         # Root layout
├── lib/                   # Library code
│   └── contracts/         # Smart contract configurations
│       ├── TrustedIssuersRegistry.ts  # Contract ABI & address
│       ├── index.ts       # Exports
│       └── README.md      # Contract documentation
└── public/                # Static assets
```

## Using the Contract in Your Components

### Import the contract configuration

```typescript
import {
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  TRUSTED_ISSUERS_REGISTRY_ABI,
  NETWORK_CONFIG,
  CONTRACT_OWNER,
} from '@/lib/contracts';
```

### Example: Reading contract data

```typescript
import { ethers } from 'ethers';
import { TRUSTED_ISSUERS_REGISTRY_ADDRESS, TRUSTED_ISSUERS_REGISTRY_ABI } from '@/lib/contracts';

const provider = new ethers.JsonRpcProvider('http://localhost:8545');
const contract = new ethers.Contract(
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  TRUSTED_ISSUERS_REGISTRY_ABI,
  provider
);

// Get all trusted issuers
const issuers = await contract.getTrustedIssuers();
console.log('Trusted Issuers:', issuers);

// Check if an address is trusted
const isTrusted = await contract.isTrustedIssuer('0x...');
console.log('Is Trusted:', isTrusted);
```

See `lib/contracts/README.md` for more examples using different libraries (ethers, viem, wagmi).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
