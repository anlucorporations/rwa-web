'use client';

/**
 * Puente de sesión SIWE (RF-W-01): usa los hooks wagmi de la app (no del paquete
 * compartido, para compartir el mismo contexto) y crea la cookie al conectar.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useWalletClient } from 'wagmi';
import { ensureSiweSession } from '@rwa/ui';

export default function SiweSessionBridge() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address || !walletClient?.account) return;
    if (attempted.current === address) return;
    attempted.current = address;

    void ensureSiweSession(address, (message) =>
      walletClient.signMessage({ account: walletClient.account!, message }),
    )
      .then(() => {
        // Las queries lanzadas antes de la sesión recibieron 401: se reintentan.
        void queryClient.invalidateQueries();
      })
      .catch(() => {
        // La wallet puede rechazar la firma: se reintenta al reconectar.
        attempted.current = null;
      });
  }, [address, isConnected, walletClient, queryClient]);

  return null;
}
