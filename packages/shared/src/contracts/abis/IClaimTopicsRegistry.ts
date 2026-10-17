/**
 * GENERADO por scripts/sync-contracts.sh desde rwa-sc/sc/abis/IClaimTopicsRegistry.json — NO EDITAR.
 */

export const IClaimTopicsRegistryAbi = (
[
  {
    "type": "function",
    "name": "claimTopicExists",
    "inputs": [
      {
        "name": "_claimTopic",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getClaimTopics",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getClaimTopicsCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  }
]
) as const;
