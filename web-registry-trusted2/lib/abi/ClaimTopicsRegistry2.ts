export const CLAIM_TOPICS_REGISTRY_2_ABI = [
  {
    type: 'function',
    name: 'addClaimTopic',
    inputs: [
      { name: '_id', type: 'uint256' },
      { name: '_name', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removeClaimTopic',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateClaimTopicName',
    inputs: [
      { name: '_id', type: 'uint256' },
      { name: '_newName', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimTopicExists',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getClaimTopic',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'exists', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getClaimTopicName',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAllClaimTopics',
    inputs: [],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getClaimTopicsCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ClaimTopicAdded',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'name', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'ClaimTopicRemoved',
    inputs: [{ name: 'id', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'ClaimTopicNameUpdated',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'newName', type: 'string' },
    ],
  },
] as const;
