/**
 * Types for Token Management
 */

export interface Token {
  _id?: string;
  name: string;
  symbol: string;
  decimals: number;
  tokenAddress: string;
  adminAddress: string;
  complianceAddress?: string; // First/main module (backward compatibility)
  complianceModules?: string[]; // Array of all compliance modules
  requiredClaims: number[];        // Claim topics required for investment
  price?: number; // Price per token in ETH
  createdAt: Date;
  updatedAt: Date;
  // Blockchain data
  transactionHash?: string;
  blockNumber?: number;
  // Additional metadata
  totalSupply?: string;
  description?: string;
}

export interface CreateTokenDto {
  name: string;
  symbol: string;
  decimals: number;
  adminAddress: string;
  requiredClaims: number[];
  description?: string;
}

export interface AddComplianceDto {
  tokenId: string;
  tokenAddress: string;
  complianceAddress: string;
}

/**
 * Investment Claim Requirements
 * 
 * These are the standard claim topics required for investors
 */
export const INVESTMENT_CLAIMS = {
  KYC: 1,                    // Know Your Customer
  ACCREDITATION: 7,          // Accredited Investor
  JURISDICTION: 9,           // Geographic Compliance
} as const;

export const CLAIM_DESCRIPTIONS: Record<number, { name: string; description: string }> = {
  1: {
    name: "KYC - Know Your Customer",
    description: "Verification of investor identity and basic information"
  },
  7: {
    name: "Accredited Investor",
    description: "Certification of investor accreditation status and financial capacity"
  },
  9: {
    name: "Jurisdiction Compliance",
    description: "Verification of geographic location and regulatory compliance"
  },
};

