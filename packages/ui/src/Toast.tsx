'use client';

/**
 * Notificaciones unificadas (O5.6): sustituyen a `alert()` en las 3 apps.
 *
 * Accesibles (`role` + `aria-live`), con cierre manual y autodescarte. Los errores
 * permanecen más tiempo y se anuncian como `alert`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = { id: number; message: string; variant: ToastVariant };

export interface ToastApi {
  notify: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-green-300 bg-green-700 text-white',
  error: 'border-red-300 bg-red-700 text-white',
  info: 'border-slate-300 bg-slate-800 text-white',
};

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const sequence = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      sequence.current += 1;
      const id = sequence.current;
      setItems((previous) => [...previous, { id, message, variant }]);
      setTimeout(() => remove(id), variant === 'error' ? 8_000 : 5_000);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      notify,
      success: (message) => notify(message, 'success'),
      error: (message) => notify(message, 'error'),
      info: (message) => notify(message, 'info'),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg ${VARIANT_STYLES[item.variant]}`}
          >
            <span aria-hidden className="mt-0.5 shrink-0 font-bold">
              {VARIANT_ICON[item.variant]}
            </span>
            <p className="flex-1 whitespace-pre-wrap break-words text-sm">{item.message}</p>
            <button
              onClick={() => remove(item.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 rounded p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return context;
}
