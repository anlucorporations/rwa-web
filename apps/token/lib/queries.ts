/**
 * Estado de datos de la app de token con TanStack Query (O4.7).
 *
 * Centraliza claves y consultas de la API tipada (`@rwa/shared/api/client`)
 * para que los componentes no gestionen `fetch` + `loading` + `error` a mano.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@rwa/shared/api/client';
import type { Token } from '@/types/token';

export const tokenKeys = {
  all: ['tokens'] as const,
  list: (adminAddress?: string, refreshTrigger?: number) =>
    [...tokenKeys.all, 'list', adminAddress ?? 'all', refreshTrigger ?? 0] as const,
};

/** Lista de tokens; `adminAddress` filtra por creador y `refreshTrigger` fuerza recarga. */
export function useTokensQuery(adminAddress?: string, refreshTrigger?: number) {
  return useQuery({
    queryKey: tokenKeys.list(adminAddress, refreshTrigger),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (adminAddress) params.set('adminAddress', adminAddress);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return apiClient.get<Token[]>(`/api/tokens${suffix}`);
    },
  });
}
