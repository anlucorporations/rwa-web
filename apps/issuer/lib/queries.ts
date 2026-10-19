/**
 * Estado de datos del panel de emisor con TanStack Query (O4.7).
 *
 * - `useIssuerRequestsQuery`: solicitudes dirigidas al emisor.
 * - `useTrustedIssuersQuery`: issuers + topics leídos del TrustedIssuersRegistry.
 * - `useUpdateRequestMutation`: aprobar/rechazar con invalidación de la lista.
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

export type IssuerData = {
  address: Address;
  claimTopics: readonly bigint[];
  isTrusted: boolean;
};

export const issuerKeys = {
  requestsAll: ['issuer-requests'] as const,
  requests: (issuerAddress: string, filter: string) =>
    [...issuerKeys.requestsAll, issuerAddress, filter] as const,
  trustedIssuers: ['trusted-issuers'] as const,
};

/** Solicitudes de claim dirigidas al emisor. */
export function useIssuerRequestsQuery(
  issuerAddress: string,
  filter: 'all' | 'pending' | 'approved' | 'rejected' = 'pending',
) {
  return useQuery({
    queryKey: issuerKeys.requests(issuerAddress, filter),
    queryFn: async () => {
      const params = new URLSearchParams({ issuerAddress });
      if (filter !== 'all') params.set('status', filter);
      return apiClient.get<ClaimRequest[]>(`/api/issuer-requests?${params.toString()}`);
    },
    enabled: Boolean(issuerAddress),
  });
}

/** Issuers confiables y sus topics, leídos on-chain. */
export function useTrustedIssuersQuery() {
  return useQuery({
    queryKey: issuerKeys.trustedIssuers,
    queryFn: async (): Promise<IssuerData[]> => {
      const client = getPublicClient();
      const registry = TRUSTED_ISSUERS_REGISTRY_ADDRESS as Address;

      const addresses = await client.readContract({
        address: registry,
        abi: TRUSTED_ISSUERS_REGISTRY_ABI,
        functionName: 'getTrustedIssuers',
      });

      return Promise.all(
        addresses.map(async (address) => {
          const claimTopics = await client.readContract({
            address: registry,
            abi: TRUSTED_ISSUERS_REGISTRY_ABI,
            functionName: 'getIssuerClaimTopics',
            args: [address],
          });
          const isTrusted = await client.readContract({
            address: registry,
            abi: TRUSTED_ISSUERS_REGISTRY_ABI,
            functionName: 'isTrustedIssuer',
            args: [address],
          });
          return { address, claimTopics, isTrusted };
        }),
      );
    },
    staleTime: 30_000,
  });
}

export interface UpdateRequestInput {
  requestId: string;
  status: 'approved' | 'rejected';
  reviewNote: string;
  claim?: unknown;
  claimSignature?: string;
  issuerSignedMessage?: string;
  issuerSignature?: string;
}

/** Revisión de una solicitud; invalida la lista del emisor. */
export function useUpdateRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRequestInput) => apiClient.post<ClaimRequest>('/api/update-request', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: issuerKeys.requestsAll }),
  });
}
