'use client';

import { ErrorState } from '@rwa/ui';

/**
 * Frontera de error raíz de la app de token (RF-W-16).
 * Cubre todas las rutas hijas; no muestra `error.message` de librería.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState detail={error.digest} onRetry={reset} />;
}
