export interface Issuer {
  issuerAddress: string;
  name: string;
  claimTopics: bigint[];
  exists: boolean;
}

export interface ClaimTopic {
  id: bigint;
  name: string;
  exists: boolean;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}
