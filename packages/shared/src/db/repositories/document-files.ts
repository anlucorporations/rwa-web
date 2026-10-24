/**
 * Repositorio de `rwa.document_files` — documentos KYC en `bytea` (sustituye GridFS).
 *
 * Desde O5.4 el binario se guarda cifrado con **AES-256-GCM** (D-093/D-098): el
 * llamador indica `encryptionAlgo`/`encryptionNonce` y la autorización por propiedad
 * vive en las rutas de descarga (O1.4). Las filas antiguas con `'none'` se siguen
 * leyendo sin cifrar (compatibilidad).
 */

import { query } from '../pool';
import { translatePgError } from '../pg-errors';
import type { DocumentFileMetaRow, DocumentFileRow } from '../types';

const META_COLUMNS =
  'id, claim_request_id, original_name, content_type, size_bytes, sha256, ' +
  "encryption_algo, encryption_nonce, uploaded_by, created_at";

const FULL_COLUMNS = `${META_COLUMNS}, content`;

export type CreateDocumentFileInput = {
  claimRequestId: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  sha256: Buffer;
  content: Buffer;
  /** `'AES-256-GCM'` (O5.4); `'none'` solo para filas anteriores a O5.4. */
  encryptionAlgo: string;
  encryptionNonce?: Buffer | null;
  uploadedBy: string;
};

export class DocumentFilesRepository {
  async create(input: CreateDocumentFileInput): Promise<DocumentFileMetaRow> {
    try {
      const { rows } = await query<DocumentFileMetaRow>(
        `INSERT INTO rwa.document_files
           (claim_request_id, original_name, content_type, size_bytes, sha256, content,
            encryption_algo, encryption_nonce, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${META_COLUMNS}`,
        [
          input.claimRequestId,
          input.originalName,
          input.contentType,
          input.sizeBytes,
          input.sha256,
          input.content,
          input.encryptionAlgo,
          input.encryptionNonce ?? null,
          input.uploadedBy,
        ],
      );
      return rows[0];
    } catch (error) {
      translatePgError(error, 'No se pudo almacenar el documento');
    }
  }

  /** Fila completa, incluido el binario (para descarga). */
  async findById(id: string): Promise<DocumentFileRow | null> {
    const { rows } = await query<DocumentFileRow>(
      `SELECT ${FULL_COLUMNS} FROM rwa.document_files WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** Solo metadatos (nunca devolver el binario en listados). */
  async findMetaById(id: string): Promise<DocumentFileMetaRow | null> {
    const { rows } = await query<DocumentFileMetaRow>(
      `SELECT ${META_COLUMNS} FROM rwa.document_files WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async listByClaimRequest(claimRequestId: string): Promise<DocumentFileMetaRow[]> {
    const { rows } = await query<DocumentFileMetaRow>(
      `SELECT ${META_COLUMNS} FROM rwa.document_files
        WHERE claim_request_id = $1 ORDER BY created_at ASC`,
      [claimRequestId],
    );
    return rows;
  }

  /** Documentos de varias solicitudes en una consulta (evita el N+1 en los listados). */
  async listByClaimRequestIds(claimRequestIds: readonly string[]): Promise<DocumentFileMetaRow[]> {
    if (claimRequestIds.length === 0) return [];
    const { rows } = await query<DocumentFileMetaRow>(
      `SELECT ${META_COLUMNS} FROM rwa.document_files
        WHERE claim_request_id = ANY($1::uuid[]) ORDER BY created_at ASC`,
      [[...claimRequestIds]],
    );
    return rows;
  }

  async list(filter: { limit?: number; offset?: number } = {}): Promise<DocumentFileMetaRow[]> {
    const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
    const offset = Math.max(filter.offset ?? 0, 0);
    const { rows } = await query<DocumentFileMetaRow>(
      `SELECT ${META_COLUMNS} FROM rwa.document_files ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return rows;
  }

  async count(): Promise<number> {
    const { rows } = await query<{ total: string }>(
      'SELECT count(*)::text AS total FROM rwa.document_files',
    );
    return Number(rows[0]?.total ?? 0);
  }

  /**
   * Almacenamiento acumulado (en bytes) subido por una wallet (RF-W-05, cuota).
   * `size_bytes` es el tamaño del texto plano, que es lo que se factura/cuota.
   */
  async sumSizeByUploader(uploadedBy: string): Promise<number> {
    const { rows } = await query<{ total: string }>(
      `SELECT coalesce(sum(size_bytes), 0)::text AS total
         FROM rwa.document_files WHERE lower(uploaded_by) = lower($1)`,
      [uploadedBy],
    );
    return Number(rows[0]?.total ?? 0);
  }
}
