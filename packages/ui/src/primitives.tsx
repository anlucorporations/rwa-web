'use client';

/**
 * Primitivas de UI compartidas (O4.3): modal, campo de información y bloque de código.
 */

import type { ReactNode } from 'react';

import type { ClaimRequestStatus } from './types';

export function StatusBadge({ status }: { status: ClaimRequestStatus }) {
  const badges: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  const icons: Record<string, string> = { pending: '⏳', approved: '✅', rejected: '❌' };
  const style = badges[status] ?? badges.pending;
  const icon = icons[status] ?? icons.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ${style}`}>
      {icon} {String(status).toUpperCase()}
    </span>
  );
}

export function InfoField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <div className="text-sm text-gray-900 dark:text-white">{children}</div>
    </div>
  );
}

export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <code className="block break-all rounded bg-gray-50 p-2 font-mono text-xs text-gray-900 dark:bg-gray-900 dark:text-white">
      {children}
    </code>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Cerrar"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
