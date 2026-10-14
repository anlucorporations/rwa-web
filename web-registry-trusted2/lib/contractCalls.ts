import { getPublicClient, getWalletClient } from './web3';
import { CONTRACTS, OWNER_ADDRESS } from './contracts';
import { Issuer, ClaimTopic } from './types';

// Trusted Issuers Registry Functions
export const getAllIssuers = async (): Promise<string[]> => {
  const client = getPublicClient();
  const result = await client.readContract({
    address: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.abi as any,
    functionName: 'getAllIssuers',
  });
  return result as string[];
};

export const getIssuerDetails = async (address: string): Promise<Issuer | null> => {
  try {
    const client = getPublicClient();
    const result = await client.readContract({
      address: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.address as `0x${string}`,
      abi: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.abi as any,
      functionName: 'getIssuer',
      args: [address as `0x${string}`],
    });
    return result as Issuer;
  } catch {
    return null;
  }
};

export const getIssuersCount = async (): Promise<number> => {
  const client = getPublicClient();
  const result = await client.readContract({
    address: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.abi as any,
    functionName: 'getIssuersCount',
  });
  return Number(result);
};

export const addIssuer = async (issuerAddress: string, name: string) => {
  const walletClient = await getWalletClient();
  const accounts = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    address: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.abi as any,
    functionName: 'addIssuer',
    args: [issuerAddress as `0x${string}`, name],
    account: accounts[0],
    chain: null,
  } as any);

  return hash;
};

// Claim Topics Registry Functions
export const getAllClaimTopics = async (): Promise<bigint[]> => {
  const client = getPublicClient();
  const result = await client.readContract({
    address: CONTRACTS.CLAIM_TOPICS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.CLAIM_TOPICS_REGISTRY_2.abi as any,
    functionName: 'getAllClaimTopics',
  });
  return result as bigint[];
};

export const getClaimTopicDetails = async (id: bigint): Promise<ClaimTopic | null> => {
  try {
    const client = getPublicClient();
    const result = await client.readContract({
      address: CONTRACTS.CLAIM_TOPICS_REGISTRY_2.address as `0x${string}`,
      abi: CONTRACTS.CLAIM_TOPICS_REGISTRY_2.abi as any,
      functionName: 'getClaimTopic',
      args: [id],
    });
    return result as ClaimTopic;
  } catch {
    return null;
  }
};

export const getClaimTopicsCount = async (): Promise<number> => {
  const client = getPublicClient();
  const result = await client.readContract({
    address: CONTRACTS.CLAIM_TOPICS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.CLAIM_TOPICS_REGISTRY_2.abi as any,
    functionName: 'getClaimTopicsCount',
  });
  return Number(result);
};

export const addClaimTopic = async (id: number, name: string) => {
  const walletClient = await getWalletClient();
  const accounts = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    address: CONTRACTS.CLAIM_TOPICS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.CLAIM_TOPICS_REGISTRY_2.abi as any,
    functionName: 'addClaimTopic',
    args: [BigInt(id), name],
    account: accounts[0],
    chain: null,
  } as any);

  return hash;
};

// Issuer Claim Topics Management
export const addClaimTopicToIssuer = async (issuerAddress: string, claimTopicId: number) => {
  const walletClient = await getWalletClient();
  const accounts = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    address: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.abi as any,
    functionName: 'addClaimTopicToIssuer',
    args: [issuerAddress as `0x${string}`, BigInt(claimTopicId)],
    account: accounts[0],
    chain: null,
  } as any);

  return hash;
};

export const removeClaimTopicFromIssuer = async (issuerAddress: string, claimTopicId: number) => {
  const walletClient = await getWalletClient();
  const accounts = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    address: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.abi as any,
    functionName: 'removeClaimTopicFromIssuer',
    args: [issuerAddress as `0x${string}`, BigInt(claimTopicId)],
    account: accounts[0],
    chain: null,
  } as any);

  return hash;
};

export const getIssuerClaimTopics = async (issuerAddress: string): Promise<bigint[]> => {
  const client = getPublicClient();
  const result = await client.readContract({
    address: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.abi as any,
    functionName: 'getIssuerClaimTopics',
    args: [issuerAddress as `0x${string}`],
  });
  return result as bigint[];
};

export const issuerHasClaimTopic = async (issuerAddress: string, claimTopicId: number): Promise<boolean> => {
  const client = getPublicClient();
  const result = await client.readContract({
    address: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.abi as any,
    functionName: 'issuerHasClaimTopic',
    args: [issuerAddress as `0x${string}`, BigInt(claimTopicId)],
  });
  return result as boolean;
};

export const getIssuerClaimTopicsCount = async (issuerAddress: string): Promise<number> => {
  const client = getPublicClient();
  const result = await client.readContract({
    address: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.address as `0x${string}`,
    abi: CONTRACTS.TRUSTED_ISSUERS_REGISTRY_2.abi as any,
    functionName: 'getIssuerClaimTopicsCount',
    args: [issuerAddress as `0x${string}`],
  });
  return Number(result);
};

export const isOwner = (address: string | null): boolean => {
  if (!address) return false;
  return address.toLowerCase() === OWNER_ADDRESS.toLowerCase();
};
