# Smart Contracts Configuration

This directory contains the ABI and deployed addresses for smart contracts used in the application.

## TrustedIssuersRegistry Contract

### Deployment Information

- **Contract Address**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- **Network**: Anvil Local (Chain ID: 31337)
- **Owner**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Transaction Hash**: `0x5e750f5244089cf3ecb36867d6a75622d495257c7089350c2c5f7272cd1363a2`
- **Block Number**: 3

### Contract Functions

#### Write Functions (Only Owner)

1. **addTrustedIssuer(address _issuer, uint256[] _claimTopics)**
   - Adds a trusted issuer with specific claim topics
   - Only callable by contract owner

2. **removeTrustedIssuer(address _issuer)**
   - Removes a trusted issuer
   - Only callable by contract owner

3. **updateIssuerClaimTopics(address _issuer, uint256[] _claimTopics)**
   - Updates claim topics for an existing issuer
   - Only callable by contract owner

4. **transferOwnership(address newOwner)**
   - Transfers contract ownership
   - Only callable by current owner

5. **renounceOwnership()**
   - Renounces contract ownership (leaves contract without owner)
   - Only callable by current owner

#### Read Functions (Public)

1. **isTrustedIssuer(address _issuer) → bool**
   - Checks if an address is a trusted issuer

2. **getIssuerClaimTopics(address _issuer) → uint256[]**
   - Returns the claim topics an issuer can issue

3. **hasClaimTopic(address _issuer, uint256 _claimTopic) → bool**
   - Checks if an issuer can issue a specific claim topic

4. **getTrustedIssuers() → address[]**
   - Returns array of all trusted issuer addresses

5. **getTrustedIssuersCount() → uint256**
   - Returns the total number of trusted issuers

6. **owner() → address**
   - Returns the current contract owner

### Events

1. **TrustedIssuerAdded(address indexed issuer, uint256[] claimTopics)**
   - Emitted when a new trusted issuer is added

2. **TrustedIssuerRemoved(address indexed issuer)**
   - Emitted when a trusted issuer is removed

3. **ClaimTopicsUpdated(address indexed issuer, uint256[] claimTopics)**
   - Emitted when an issuer's claim topics are updated

4. **OwnershipTransferred(address indexed previousOwner, address indexed newOwner)**
   - Emitted when contract ownership is transferred

## Usage Examples

### Import in your components

```typescript
import {
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  TRUSTED_ISSUERS_REGISTRY_ABI,
  NETWORK_CONFIG,
  CONTRACT_OWNER,
} from '@/lib/contracts';
```

### Using with ethers.js

```typescript
import { ethers } from 'ethers';
import { TRUSTED_ISSUERS_REGISTRY_ADDRESS, TRUSTED_ISSUERS_REGISTRY_ABI } from '@/lib/contracts';

// Read-only provider
const provider = new ethers.JsonRpcProvider('http://localhost:8545');
const contract = new ethers.Contract(
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  TRUSTED_ISSUERS_REGISTRY_ABI,
  provider
);

// Get all trusted issuers
const issuers = await contract.getTrustedIssuers();

// Check if an address is trusted
const isTrusted = await contract.isTrustedIssuer('0x...');
```

### Using with viem

```typescript
import { createPublicClient, http } from 'viem';
import { localhost } from 'viem/chains';
import { TRUSTED_ISSUERS_REGISTRY_ADDRESS, TRUSTED_ISSUERS_REGISTRY_ABI } from '@/lib/contracts';

const client = createPublicClient({
  chain: localhost,
  transport: http(),
});

// Read contract
const issuers = await client.readContract({
  address: TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  abi: TRUSTED_ISSUERS_REGISTRY_ABI,
  functionName: 'getTrustedIssuers',
});
```

### Using with wagmi

```typescript
import { useReadContract } from 'wagmi';
import { TRUSTED_ISSUERS_REGISTRY_ADDRESS, TRUSTED_ISSUERS_REGISTRY_ABI } from '@/lib/contracts';

function MyComponent() {
  const { data: issuers } = useReadContract({
    address: TRUSTED_ISSUERS_REGISTRY_ADDRESS,
    abi: TRUSTED_ISSUERS_REGISTRY_ABI,
    functionName: 'getTrustedIssuers',
  });

  return <div>{/* Display issuers */}</div>;
}
```

## Network Configuration

Make sure your wallet and local Anvil node are running on the correct network:

- **Chain ID**: 31337
- **RPC URL**: http://localhost:8545

## Notes

- This deployment is on a local Anvil network (for development only)
- For production deployments, update the contract address and network configuration
- Keep the private keys secure and never commit them to the repository
- The owner address has special privileges - ensure it's properly secured

