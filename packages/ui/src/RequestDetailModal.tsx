'use client';

/**
 * Modal de detalle de una solicitud de claim, compartido por las apps de
 * identidad (inversor) y emisor (O4.3).
 *
 * Muestra los datos comunes de la solicitud y delega las acciones de cada rol en
 * `actions` (firmar/addClaim en el inversor, aprobar/rechazar en el emisor).
 */

import type { ReactNode } from 'react';

import { CodeBlock, InfoField, Modal, StatusBadge } from './primitives';
import type { ClaimRequestLike } from './types';

export interface RequestDetailModalProps {
  request: ClaimRequestLike;
  onClose: () => void;
  /** Rol que abre el modal; ajusta textos y secciones. */
  variant?: 'investor' | 'issuer';
  /** Nombre legible del claim topic (opcional; si falta se usa el número). */
  topicName?: string;
  /** Identidad on-chain del inversor (solo variante investor). */
  identityAddress?: string;
  /** Error de la última acción (se muestra en el modal). */
  error?: string | null;
  /** Acciones del rol (botones, nota de revisión, etc.). */
  actions?: ReactNode;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString();
}

export function RequestDetailModal({
  request,
  onClose,
  variant = 'investor',
  topicName,
  identityAddress,
  error,
  actions,
}: RequestDetailModalProps) {
  const isInvestor = variant === 'investor';
  const topic = Number(request.claimTopic);

  return (
    <Modal title={isInvestor ? 'Request Details' : 'Claim Request Details'} onClose={onClose}>
      <div className="mb-6">
        <StatusBadge status={request.status} />
      </div>

      <div className="space-y-4">
        <InfoField label="Requester Address">
          <CodeBlock>{request.requesterAddress}</CodeBlock>
        </InfoField>

        <InfoField label={isInvestor ? 'Issuer Address' : 'Issuer Address (You)'}>
          <CodeBlock>{request.issuerAddress}</CodeBlock>
        </InfoField>

        <InfoField label="Claim Topic">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            Topic {topic}
            {topicName ? ` · ${topicName}` : ''}
          </p>
        </InfoField>

        {isInvestor && identityAddress && (
          <InfoField label="Your Identity Contract">
            <CodeBlock>{identityAddress}</CodeBlock>
          </InfoField>
        )}

        {request.message && (
          <InfoField label="Message">
            <p className="text-gray-900 dark:text-gray-100">{request.message}</p>
          </InfoField>
        )}

        {request.documentFileId && (
          <InfoField label="Attached Document">
            <a
              href={`/api/download/${request.documentFileId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              📎 {request.documentName || 'Download Document'}
              {request.documentSize ? (
                <span className="text-xs">({(request.documentSize / 1024).toFixed(1)} KB)</span>
              ) : null}
            </a>
          </InfoField>
        )}

        {request.signedMessage && request.signature && (
          <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="mb-2 text-sm font-medium text-green-900 dark:text-green-300">
              ✍️ Digital Signature (verified by wallet)
            </p>
            <div className="space-y-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-green-800 dark:text-green-400">
                  Signed Message:
                </p>
                <pre className="whitespace-pre-wrap break-words rounded bg-white p-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  {request.signedMessage}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-green-800 dark:text-green-400">
                  Signature:
                </p>
                <CodeBlock>{request.signature}</CodeBlock>
              </div>
            </div>
          </div>
        )}

        {!isInvestor && request.issuerSignature && (
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-300">
              ✅ Reviewed & signed by issuer
            </p>
            <CodeBlock>{request.issuerSignature}</CodeBlock>
            {request.reviewNote && (
              <p className="mt-2 text-sm text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> {request.reviewNote}
              </p>
            )}
          </div>
        )}

        {isInvestor && request.claimSignature && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
            <p className="mb-2 text-sm font-medium text-purple-900 dark:text-purple-300">
              🔐 Claim firmado por el emisor (EIP-712)
            </p>
            <CodeBlock>{request.claimSignature}</CodeBlock>
            <p className="mt-2 text-xs text-purple-800 dark:text-purple-400">
              Añádelo a tu identidad on-chain para que el token te acepte como inversor.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {actions && <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">{actions}</div>}

      <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Created: {formatDate(request.createdAt)}</span>
        <span>Updated: {formatDate(request.updatedAt)}</span>
      </div>
    </Modal>
  );
}
