/**
 * Identidad seudónima del usuario (CU-03, RF-V3-03/06).
 *
 * La wallet se guarda normalizada y NUNCA se expone en el alias público.
 */
import { query, normalizeAddress } from "@rwa/shared";

export interface Identity {
  id: string;
  wallet_address: string;
  display_alias: string;
  status: "active" | "suspended" | "recovering";
  kyc_level: number;
  created_at: Date;
}

const COLUMNS = "id, wallet_address, display_alias, status, kyc_level, created_at";

function newAlias(): string {
  const suffix = Array.from({ length: 8 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)],
  ).join("");
  return `barlo-${suffix}`;
}

export async function findIdentity(wallet: string): Promise<Identity | null> {
  const normalized = normalizeAddress(wallet);
  const { rows } = await query<Identity>(
    `SELECT ${COLUMNS} FROM rwa.identities WHERE lower(wallet_address) = lower($1)`,
    [normalized],
  );
  return rows[0] ?? null;
}

/** Crea la identidad de forma idempotente (si ya existe, la devuelve). */
export async function createIdentity(wallet: string): Promise<Identity> {
  const normalized = normalizeAddress(wallet);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { rows } = await query<Identity>(
      `INSERT INTO rwa.identities (wallet_address, display_alias)
       VALUES ($1, $2)
       ON CONFLICT (wallet_address) DO NOTHING
       RETURNING ${COLUMNS}`,
      [normalized, newAlias()],
    );
    if (rows[0]) return rows[0];
    const existing = await findIdentity(normalized);
    if (existing) return existing;
  }
  throw new Error("No se pudo generar un alias único para la identidad");
}
