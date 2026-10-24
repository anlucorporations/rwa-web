'use client';

/**
 * Estados compartidos de carga y error (RF-W-16 / RNF-W-05).
 *
 * Se usan en los `loading.tsx` y `error.tsx` de las 3 apps para que la
 * experiencia sea homogénea. Usan `text-current` y bordes heredados para
 * funcionar tanto sobre los fondos claros (identidad/emisor) como sobre el
 * fondo oscuro de la app de token.
 */

import type { ReactNode } from 'react';

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-current"
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Algo salió mal',
  message = 'Se produjo un error inesperado. Puedes reintentar la operación.',
  detail,
  onRetry,
  children,
}: {
  title?: string;
  message?: string;
  /** Referencia técnica (p. ej. `digest` de Next) para soporte; no expone internals. */
  detail?: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center text-current"
    >
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-sm opacity-80">{message}</p>
      {detail ? <p className="font-mono text-xs opacity-60">ref: {detail}</p> : null}
      {children}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-current px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
