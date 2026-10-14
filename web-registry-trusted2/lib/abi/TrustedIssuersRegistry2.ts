export const TRUSTED_ISSUERS_REGISTRY_2_ABI = [
  {
    type: 'function',
    name: 'addIssuer',
    inputs: [
      { name: '_issuerAddress', type: 'address' },
      { name: '_name', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removeIssuer',
    inputs: [{ name: '_issuerAddress', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateIssuerName',
    inputs: [
      { name: '_issuerAddress', type: 'address' },
      { name: '_newName', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'issuerExists',
    inputs: [{ name: '_issuerAddress', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getIssuer',
    inputs: [{ name: '_issuerAddress', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'issuerAddress', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'claimTopics', type: 'uint256[]' },
          { name: 'exists', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getIssuerName',
    inputs: [{ name: '_issuerAddress', type: 'address' }],
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAllIssuers',
    inputs: [],
    outputs: [{ type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getIssuersCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'addClaimTopicToIssuer',
    inputs: [
      { name: '_issuerAddress', type: 'address' },
      { name: '_claimTopicId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removeClaimTopicFromIssuer',
    inputs: [
      { name: '_issuerAddress', type: 'address' },
      { name: '_claimTopicId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getIssuerClaimTopics',
    inputs: [{ name: '_issuerAddress', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'issuerHasClaimTopic',
    inputs: [
      { name: '_issuerAddress', type: 'address' },
      { name: '_claimTopicId', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getIssuerClaimTopicsCount',
    inputs: [{ name: '_issuerAddress', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'IssuerAdded',
    inputs: [
      { name: 'issuerAddress', type: 'address', indexed: true },
      { name: 'name', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'IssuerRemoved',
    inputs: [{ name: 'issuerAddress', type: 'address', indexed: true }],
  },
  {
    type: 'event',
    name: 'IssuerNameUpdated',
    inputs: [
      { name: 'issuerAddress', type: 'address', indexed: true },
      { name: 'newName', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'ClaimTopicAddedToIssuer',
    inputs: [
      { name: 'issuerAddress', type: 'address', indexed: true },
      { name: 'claimTopic', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'ClaimTopicRemovedFromIssuer',
    inputs: [
      { name: 'issuerAddress', type: 'address', indexed: true },
      { name: 'claimTopic', type: 'uint256', indexed: true },
    ],
  },
] as const;
