/**
 * Estado de datos de la app de identidad con TanStack Query (O4.7).
 *
 * - `useClaimRequestsQuery`: solicitudes del inversor (API tipada).
 * - `useTrustedIssuersQuery`: issuers + topics leídos del TrustedIssuersRegistry.
 * - `useCreateClaimRequestMutation`: alta de solicitud + invalidación de la lista.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rwa/shared/api/client';
import {
  TRUSTED_ISSUERS_REGISTRY_ABI,
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
} from '@rwa/shared/network';
import { getPublicClient } from '@rwa/shared/web3';
import type { Address } from 'viem';
import type { ClaimRequest } from '@/types/claim-request';

export type IssuerInfo = {
  address: Address;
  claimTopics: readonly bigint[];
  name?: string;
};

export const identityKeys = {
  requestsAll: ['claim-requests'] as const,
  requests: (userAddress: string, filter: string, refreshTrigger: number) =>
    [...identityKeys.requestsAll, userAddress, filter, refreshTrigger] as const,
  issuers: ['trusted-issuers'] as const,
};

/** Solicitudes de claim del inversor autenticado. */
export function useClaimRequestsQuery(
  userAddress: string,
  filter: 'all' | 'pending' | 'approved' | 'rejected' = 'all',
  refreshTrigger = 0,
) {
  return useQuery({
    queryKey: identityKeys.requests(userAddress, filter, refreshTrigger),
    queryFn: async () => {
      const params = new URLSearchParams({ requesterAddress: userAddress });
      if (filter !== 'all') params.set('status', filter);
      return apiClient.get<ClaimRequest[]>(`/api/claim-requests?${params.toString()}`);
    },
    enabled: Boolean(userAddress),
  });
}

/** Issuers confiables + topics, leídos on-chain y con nombres de la API. */
export function useTrustedIssuersQuery() {
  return useQuery({
    queryKey: identityKeys.issuers,
    queryFn: async (): Promise<IssuerInfo[]> => {
      const client = getPublicClient();
      const registry = TRUSTED_ISSUERS_REGISTRY_ADDRESS as Address;

      const count = await client.readContract({
        address: registry,
        abi: TRUSTED_ISSUERS_REGISTRY_ABI,
        functionName: 'getTrustedIssuersCount',
      });
      if (count === BigInt(0)) return [];

      const addresses = await client.readContract({
        address: registry,
        abi: TRUSTED_ISSUERS_REGISTRY_ABI,
        functionName: 'getTrustedIssuers',
      });

      const names: Record<string, string> = {};
      try {
        const data = await apiClient.post<Record<string, { address: string; name: string }>>(
          '/api/issuers/batch',
          { addresses: [...addresses] },
        );
        Object.values(data).forEach((issuer) => {
          names[issuer.address.toLowerCase()] = issuer.name;
        });
      } catch {
        // Sin nombres la UI muestra la dirección
      }

      return Promise.all(
        addresses.map(async (address) => {
          try {
            const claimTopics = await client.readContract({
              address: registry,
              abi: TRUSTED_ISSUERS_REGISTRY_ABI,
              functionName: 'getIssuerClaimTopics',
              args: [address],
            });
            return { address, claimTopics, name: names[address.toLowerCase()] };
          } catch {
            return { address, claimTopics: [] as bigint[], name: names[address.toLowerCase()] };
          }
        }),
      );
    },
    staleTime: 30_000,
  });
}

export interface CreateClaimRequestInput {
  requesterAddress: string;
  issuerAddress: string;
  claimTopic: string;
  message: string;
  signedMessage: string;
  signature: string;
}

/** Alta de solicitud de claim; invalida la lista al terminar. */
export function useCreateClaimRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClaimRequestInput) =>
      apiClient.post<ClaimRequest>('/api/claim-requests', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityKeys.requestsAll }),
  });
}
