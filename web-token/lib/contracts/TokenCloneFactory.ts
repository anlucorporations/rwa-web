/**
 * TokenCloneFactory Contract Configuration
 * 
 * This file contains the ABI and deployed addresses for the TokenCloneFactory contract
 * 
 * Deployed on: Besu Network (https://besu1.proyectos.codecrypto.academy)
 * Factory Address: 0x95Ac1Bf6ca44bC847A78936d67556701a764dA84
 */

export const TOKEN_CLONE_FACTORY_ADDRESS = "0xf4AC03d0be980f027887667025bB30ddB5c752Ea" as const;
export const TOKEN_IMPLEMENTATION_ADDRESS = "" as const;

export const TOKEN_CLONE_FACTORY_ABI =   [
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
      "name": "adminTokens",
      "inputs": [
          {
              "name": "",
              "type": "address",
              "internalType": "address"
          },
          {
              "name": "",
              "type": "uint256",
              "internalType": "uint256"
          }
      ],
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
      "name": "allTokens",
      "inputs": [
          {
              "name": "",
              "type": "uint256",
              "internalType": "uint256"
          }
      ],
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
      "name": "createToken",
      "inputs": [
          {
              "name": "name_",
              "type": "string",
              "internalType": "string"
          },
          {
              "name": "symbol_",
              "type": "string",
              "internalType": "string"
          },
          {
              "name": "decimals_",
              "type": "uint8",
              "internalType": "uint8"
          },
          {
              "name": "admin",
              "type": "address",
              "internalType": "address"
          },
          {
              "name": "maxTotalSupply_",
              "type": "uint256",
              "internalType": "uint256"
          }
      ],
      "outputs": [
          {
              "name": "token",
              "type": "address",
              "internalType": "address"
          }
      ],
      "stateMutability": "nonpayable"
  },
  {
      "type": "function",
      "name": "createTokenWithRegistries",
      "inputs": [
          {
              "name": "name_",
              "type": "string",
              "internalType": "string"
          },
          {
              "name": "symbol_",
              "type": "string",
              "internalType": "string"
          },
          {
              "name": "decimals_",
              "type": "uint8",
              "internalType": "uint8"
          },
          {
              "name": "admin",
              "type": "address",
              "internalType": "address"
          },
          {
              "name": "maxTotalSupply_",
              "type": "uint256",
              "internalType": "uint256"
          },
          {
              "name": "identityRegistry",
              "type": "address",
              "internalType": "address"
          },
          {
              "name": "trustedIssuersRegistry",
              "type": "address",
              "internalType": "address"
          },
          {
              "name": "claimTopicsRegistry",
              "type": "address",
              "internalType": "address"
          }
      ],
      "outputs": [
          {
              "name": "token",
              "type": "address",
              "internalType": "address"
          }
      ],
      "stateMutability": "nonpayable"
  },
  {
      "type": "function",
      "name": "getGasSavingsInfo",
      "inputs": [],
      "outputs": [
          {
              "name": "",
              "type": "string",
              "internalType": "string"
          }
      ],
      "stateMutability": "pure"
  },
  {
      "type": "function",
      "name": "getTokenAt",
      "inputs": [
          {
              "name": "index",
              "type": "uint256",
              "internalType": "uint256"
          }
      ],
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
      "name": "getTokensByAdmin",
      "inputs": [
          {
              "name": "admin",
              "type": "address",
              "internalType": "address"
          }
      ],
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
      "name": "getTotalTokens",
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
      "name": "implementation",
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
      "name": "TokenCreated",
      "inputs": [
          {
              "name": "token",
              "type": "address",
              "indexed": true,
              "internalType": "address"
          },
          {
              "name": "admin",
              "type": "address",
              "indexed": true,
              "internalType": "address"
          },
          {
              "name": "name",
              "type": "string",
              "indexed": false,
              "internalType": "string"
          },
          {
              "name": "symbol",
              "type": "string",
              "indexed": false,
              "internalType": "string"
          },
          {
              "name": "decimals",
              "type": "uint8",
              "indexed": false,
              "internalType": "uint8"
          }
      ],
      "anonymous": false
  },
  {
      "type": "error",
      "name": "FailedDeployment",
      "inputs": []
  },
  {
      "type": "error",
      "name": "InsufficientBalance",
      "inputs": [
          {
              "name": "balance",
              "type": "uint256",
              "internalType": "uint256"
          },
          {
              "name": "needed",
              "type": "uint256",
              "internalType": "uint256"
          }
      ]
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
  chainId: 31337,
  chainName: "Anvil Local",
  rpcUrl: "http://localhost:8545",
} as const;

// Factory Owner Address
export const FACTORY_OWNER = "0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38" as const;

// Gas Savings Information
export const GAS_SAVINGS = {
  cloneDeployment: "~50k gas",
  fullDeployment: "~3M gas",
  savings: "~2.95M gas per Token (98.3% reduction)",
} as const;

