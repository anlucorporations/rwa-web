/**
 * TrustedIssuersRegistry Contract Configuration
 * 
 * This file contains the ABI and deployed address for the TrustedIssuersRegistry contract
 * 
 * Deployed on: Besu Network (Chain ID: 81234)
 * Contract Address: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
 * Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
 * Block: 3
 * Transaction Hash: 0x5e750f5244089cf3ecb36867d6a75622d495257c7089350c2c5f7272cd1363a2
 */

export const TRUSTED_ISSUERS_REGISTRY_ADDRESS = "0x575765B7082552EeE5BAC31C61D9625b3f6e5c43" as const;

export const TRUSTED_ISSUERS_REGISTRY_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "initialOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "addTrustedIssuer",
    "inputs": [
      {
        "name": "_issuer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_claimTopics",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getIssuerClaimTopics",
    "inputs": [
      {
        "name": "_issuer",
        "type": "address",
        "internalType": "address"
      }
    ],
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
    "name": "getTrustedIssuers",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTrustedIssuersCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasClaimTopic",
    "inputs": [
      {
        "name": "_issuer",
        "type": "address",
        "internalType": "address"
      },
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
    "name": "isTrustedIssuer",
    "inputs": [
      {
        "name": "_issuer",
        "type": "address",
        "internalType": "address"
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
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "removeTrustedIssuer",
    "inputs": [
      {
        "name": "_issuer",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateIssuerClaimTopics",
    "inputs": [
      {
        "name": "_issuer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_claimTopics",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ClaimTopicsUpdated",
    "inputs": [
      {
        "name": "issuer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "claimTopics",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TrustedIssuerAdded",
    "inputs": [
      {
        "name": "issuer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "claimTopics",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TrustedIssuerRemoved",
    "inputs": [
      {
        "name": "issuer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const;

// Network Configuration
export const NETWORK_CONFIG = {
  chainId: 81234,
  chainName: "Besu CodeCrypto",
  rpcUrl: "https://besu1.proyectos.codecrypto.academy",
} as const;

// Contract Owner Address
export const CONTRACT_OWNER = "0x3a9B38FF944dbda3154c3b180Ad01139b2C395eE" as const;

