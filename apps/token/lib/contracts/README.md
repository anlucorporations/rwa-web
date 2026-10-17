# Smart Contracts Configuration

This directory contains the ABI and deployed addresses for smart contracts used in the application.

## TokenCloneFactory Contract

The TokenCloneFactory uses the **EIP-1167 Minimal Proxy Pattern** to create token clones with significant gas savings (~98.3% reduction compared to full deployments).

### Deployment Information

- **Factory Address**: `0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519`
- **Implementation Address**: `0xC7f2Cf4845C6db0e1a1e91ED41Bcd0FcC1b0E141`
- **Network**: Anvil Local (Chain ID: 31337)
- **Owner**: `0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38`

### Gas Savings

- **Clone Deployment**: ~50k gas
- **Full Deployment**: ~3M gas
- **Savings**: ~2.95M gas per Token (98.3% reduction!)

### Contract Functions

#### Write Functions (Public)

1. **createToken(string name_, string symbol_, uint8 decimals_, address admin) → address**
   - Creates a new token clone with basic configuration
   - Anyone can call this function
   - Returns the address of the newly created token
   - Parameters:
     - `name_`: Token name (e.g., "My Token")
     - `symbol_`: Token symbol (e.g., "MTK")
     - `decimals_`: Token decimals (typically 18)
     - `admin`: Address that will have admin rights

2. **createTokenWithRegistries(...) → address**
   - Creates a token clone with registries pre-configured
   - Automatically sets up Identity, Trusted Issuers, and Claim Topics registries
   - Grants all necessary roles to the admin
   - Parameters:
     - `name_`: Token name
     - `symbol_`: Token symbol
     - `decimals_`: Token decimals
     - `admin`: Admin address
     - `identityRegistry`: Identity registry address
     - `trustedIssuersRegistry`: Trusted issuers registry address
     - `claimTopicsRegistry`: Claim topics registry address

3. **transferOwnership(address newOwner)**
   - Transfers factory ownership (Owner only)

4. **renounceOwnership()**
   - Renounces factory ownership (Owner only)

#### Read Functions (Public)

1. **getTotalTokens() → uint256**
   - Returns the total number of tokens created by the factory

2. **getTokensByAdmin(address admin) → address[]**
   - Returns an array of all tokens created for a specific admin

3. **getTokenAt(uint256 index) → address**
   - Returns the token address at a specific index

4. **implementation() → address**
   - Returns the implementation contract address

5. **owner() → address**
   - Returns the factory owner address

6. **getGasSavingsInfo() → string**
   - Returns information about gas savings

7. **adminTokens(address admin, uint256 index) → address**
   - Returns a specific token address for an admin (by index)

8. **allTokens(uint256 index) → address**
   - Returns a token from the global array (by index)

### Events

1. **TokenCreated(address indexed token, address indexed admin, string name, string symbol, uint8 decimals)**
   - Emitted when a new token is created
   - Contains all token information

2. **OwnershipTransferred(address indexed previousOwner, address indexed newOwner)**
   - Emitted when factory ownership is transferred

### Errors

1. **FailedDeployment()** - Clone deployment failed
2. **InsufficientBalance(uint256 balance, uint256 needed)** - Not enough balance for deployment
3. **OwnableInvalidOwner(address owner)** - Invalid owner address
4. **OwnableUnauthorizedAccount(address account)** - Unauthorized account

## Usage Examples

### Import in your components

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

### Using with ethers.js

#### Read: Get All Tokens

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
console.log('Total tokens:', totalTokens.toString());

// Get tokens for a specific admin
const adminAddress = '0x...';
const tokens = await factory.getTokensByAdmin(adminAddress);
console.log('Admin tokens:', tokens);
```

#### Write: Create a New Token

```typescript
import { ethers } from 'ethers';
import { TOKEN_CLONE_FACTORY_ADDRESS, TOKEN_CLONE_FACTORY_ABI } from '@/lib/contracts';

// Connect with signer (wallet)
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const factory = new ethers.Contract(
  TOKEN_CLONE_FACTORY_ADDRESS,
  TOKEN_CLONE_FACTORY_ABI,
  signer
);

// Create a new token
const tx = await factory.createToken(
  "My Security Token",  // name
  "MST",                // symbol
  18,                   // decimals
  await signer.getAddress()  // admin
);

const receipt = await tx.wait();
console.log('Token created in transaction:', receipt.hash);

// Get the token address from the event
const event = receipt.logs.find(log => {
  try {
    return factory.interface.parseLog(log)?.name === 'TokenCreated';
  } catch {
    return false;
  }
});

if (event) {
  const parsed = factory.interface.parseLog(event);
  console.log('New token address:', parsed.args.token);
}
```

#### Create Token with Registries

```typescript
const tx = await factory.createTokenWithRegistries(
  "Compliant Security Token",      // name
  "CST",                           // symbol
  18,                              // decimals
  await signer.getAddress(),       // admin
  "0x...",                         // identityRegistry
  "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",  // trustedIssuersRegistry
  "0x..."                          // claimTopicsRegistry
);

await tx.wait();
console.log('Token with registries created!');
```

### Using with viem

```typescript
import { createPublicClient, http } from 'viem';
import { localhost } from 'viem/chains';
import { TOKEN_CLONE_FACTORY_ADDRESS, TOKEN_CLONE_FACTORY_ABI } from '@/lib/contracts';

const client = createPublicClient({
  chain: localhost,
  transport: http(),
});

// Read total tokens
const totalTokens = await client.readContract({
  address: TOKEN_CLONE_FACTORY_ADDRESS,
  abi: TOKEN_CLONE_FACTORY_ABI,
  functionName: 'getTotalTokens',
});

console.log('Total tokens:', totalTokens);
```

### Using with wagmi

```typescript
import { useReadContract, useWriteContract } from 'wagmi';
import { TOKEN_CLONE_FACTORY_ADDRESS, TOKEN_CLONE_FACTORY_ABI } from '@/lib/contracts';

function TokenFactory() {
  // Read data
  const { data: totalTokens } = useReadContract({
    address: TOKEN_CLONE_FACTORY_ADDRESS,
    abi: TOKEN_CLONE_FACTORY_ABI,
    functionName: 'getTotalTokens',
  });

  // Write function
  const { writeContract } = useWriteContract();

  const createToken = async () => {
    writeContract({
      address: TOKEN_CLONE_FACTORY_ADDRESS,
      abi: TOKEN_CLONE_FACTORY_ABI,
      functionName: 'createToken',
      args: ['My Token', 'MTK', 18, '0x...'],
    });
  };

  return (
    <div>
      <p>Total Tokens: {totalTokens?.toString()}</p>
      <button onClick={createToken}>Create Token</button>
    </div>
  );
}
```

## Network Configuration

Make sure your wallet and local Anvil node are running on the correct network:

- **Chain ID**: 31337
- **RPC URL**: http://localhost:8545

## Notes

- This deployment is on a local Anvil network (for development only)
- Anyone can create tokens through the factory
- The factory owner can transfer ownership but has no control over created tokens
- Each created token has its own admin with full control
- For production deployments, update the contract addresses and network configuration
- The clone pattern saves ~2.95M gas per token deployment (98.3% reduction)

## Understanding the Clone Pattern

The TokenCloneFactory uses **EIP-1167 Minimal Proxies**:

1. **Implementation Contract**: Contains all the token logic (deployed once)
2. **Clone Contracts**: Lightweight proxies that delegate calls to the implementation
3. **Gas Savings**: Clones are ~50kb vs ~3MB for full deployments

This means:
- ✅ Extremely cheap to create new tokens
- ✅ All tokens share the same audited code
- ✅ Each token has independent state and admin
- ✅ Perfect for deploying many similar tokens

## Token Contract Integration

After creating a token, you'll need the **TokenCloneable ABI** to interact with it. The token contracts have their own set of functions for:

- Minting and burning tokens
- Transfer restrictions and compliance
- Role management (AGENT_ROLE, COMPLIANCE_ROLE)
- Registry management (Identity, Trusted Issuers, Claim Topics)
- Pausing and upgrading

Refer to the TokenCloneable documentation for details on interacting with individual tokens.

