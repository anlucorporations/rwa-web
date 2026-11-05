/**
 * Tokenización de activos (CU-12/13/14, B6): registro del activo, garantía y
 * consentimiento legible del Fiador (CU-07).
 */
import { ConflictError, NotFoundError, query, translatePgError, ValidationError, withTransaction } from "@rwa/shared";
import { renderMessage } from "@rwa/wallet-messages";
import { recoverMessageAddress } from "viem";
import type { Hex } from "viem";

export interface AssetInput {
  issuerProgramSlug: string;
  assetKind: "product" | "service" | "good";
  standard: "erc721" | "erc1155";
  name: string;
  symbol?: string;
  priceBrlt: string;
  valuedBrlt?: string;
  metadataUri?: string;
  tokenAddress: string;
  onChainTokenId?: string;
  fiadorWallet: string;
  fiadorSignature: string;
}

/** Mensaje legible que firma el Fiador (wallet-messages: `guarantee.consent`). */
export function consentMessage(assetName: string): string {
  const rendered = renderMessage("guarantee.consent", "es", { activo: assetName });
  return `${rendered.title}: ${rendered.text}`;
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export async function createAsset(input: AssetInput, issuerWallet: string) {
  if (!ADDRESS.test(input.tokenAddress)) throw new ValidationError("tokenAddress inválida", "tokenAddress");
  if (!ADDRESS.test(input.fiadorWallet)) throw new ValidationError("fiadorWallet inválida", "fiadorWallet");
  if (!/^\d+(\.\d{1,8})?$/.test(input.priceBrlt) || Number(input.priceBrlt) <= 0) {
    throw new ValidationError("priceBrlt debe ser un decimal positivo", "priceBrlt");
  }

  // Consentimiento del Fiador sobre el texto legible.
  const message = consentMessage(input.name);
  const signer = await recoverMessageAddress({ message, signature: input.fiadorSignature as Hex });
  if (signer.toLowerCase() !== input.fiadorWallet.toLowerCase()) {
    throw new ValidationError("La firma del Fiador no corresponde a su wallet", "fiadorSignature");
  }

  try {
    return await withTransaction(async (client) => {
    const program = await client.query<{ id: string; credential_id: number; on_chain_topic: number | null }>(
      `SELECT ip.id, ct.id AS credential_id, ct.on_chain_topic
         FROM rwa.issuer_programs ip
         JOIN rwa.issuer_program_credentials ipc ON ipc.issuer_program_id = ip.id
         JOIN rwa.credential_types ct ON ct.id = ipc.credential_type_id
        WHERE ip.slug = $1 AND ip.active
        LIMIT 1`,
      [input.issuerProgramSlug],
    );
    if (!program.rows[0]) throw new NotFoundError("ISSUER", input.issuerProgramSlug);
    const programId = program.rows[0].id;

    // El emisor necesita identidad y claim GARANTÍA aprobado (precondición B6).
    const issuerIdentity = await client.query<{ id: string }>(
      `SELECT i.id FROM rwa.identities i WHERE lower(i.wallet_address) = lower($1)`,
      [issuerWallet],
    );
    if (!issuerIdentity.rows[0]) throw new ValidationError("El emisor no tiene identidad creada", "issuer");
    const issuerId = issuerIdentity.rows[0].id;

    const garantia = await client.query<{ id: string }>(
      `SELECT cr.id FROM rwa.claim_requests cr
         JOIN rwa.credential_types ct ON ct.id = cr.credential_type_id
        WHERE cr.identity_id = $1 AND ct.code = 'GARANTIA' AND cr.status = 'approved'
        LIMIT 1`,
      [issuerId],
    );
    if (!garantia.rows[0]) throw new ConflictError("El emisor necesita un certificado GARANTÍA aprobado");

    // El Fiador necesita identidad y claim FIADOR aprobado.
    const fiador = await client.query<{ identity_id: string; claim_id: string }>(
      `SELECT i.id AS identity_id, cr.id AS claim_id
         FROM rwa.identities i
         JOIN rwa.claim_requests cr ON cr.identity_id = i.id
         JOIN rwa.credential_types ct ON ct.id = cr.credential_type_id
        WHERE lower(i.wallet_address) = lower($1) AND ct.code = 'FIADOR' AND cr.status = 'approved'
        LIMIT 1`,
      [input.fiadorWallet],
    );
    if (!fiador.rows[0]) throw new ConflictError("El Fiador no tiene un certificado FIADOR aprobado");

    const token = await client.query<{ id: string }>(
      `INSERT INTO rwa.tokens
         (issuer_program_id, token_address, on_chain_token_id, asset_kind, standard, name, symbol,
          price_brlt, valued_brlt, metadata_uri, status, created_by)
       VALUES ($1, lower($2), $3, $4::rwa.asset_kind, $5::rwa.asset_standard, $6, $7, $8, $9, $10, 'certifying', lower($11))
       RETURNING id`,
      [
        programId, input.tokenAddress, input.onChainTokenId ?? null, input.assetKind, input.standard,
        input.name, input.symbol ?? null, input.priceBrlt, input.valuedBrlt ?? input.priceBrlt,
        input.metadataUri ?? null, issuerWallet,
      ],
    );
    const tokenId = token.rows[0].id;

    await client.query(
      `INSERT INTO rwa.token_guarantees (token_id, kind, identity_id, claim_request_id, verified, verified_at, validated_by_wallet)
       VALUES ($1, 'garantia', $2, $3, true, now(), lower($4))`,
      [tokenId, issuerId, garantia.rows[0].id, issuerWallet],
    );
    await client.query(
      `INSERT INTO rwa.token_guarantees (token_id, kind, identity_id, claim_request_id, verified, verified_at, validated_by_wallet)
       VALUES ($1, 'fiador', $2, $3, true, now(), lower($4))`,
      [tokenId, fiador.rows[0].identity_id, fiador.rows[0].claim_id, issuerWallet],
    );

    // El trigger `enforce_token_guarantees` exige Garantía y Fiador antes de publicar.
    await client.query(`UPDATE rwa.tokens SET status = 'listed' WHERE id = $1`, [tokenId]);
    return { id: tokenId, name: input.name, assetKind: input.assetKind, standard: input.standard, status: "listed" };
    });
  } catch (error) {
    translatePgError(error, "tokenización");
  }
}

export async function listCatalog() {
  const { rows } = await query(
    `SELECT t.id, t.name, t.asset_kind::text AS asset_kind, t.standard::text AS standard,
            t.price_brlt::text AS price_brlt, t.metadata_uri, ip.name AS issuer_name,
            i.display_alias AS issuer_alias
       FROM rwa.tokens t
       JOIN rwa.issuer_programs ip ON ip.id = t.issuer_program_id
       LEFT JOIN rwa.identities i ON lower(i.wallet_address) = lower(t.created_by)
      WHERE t.status IN ('listed')
      ORDER BY t.created_at DESC
      LIMIT 60`,
  );
  return rows;
}

export async function listAssetsFor(wallet: string) {
  const { rows } = await query(
    `SELECT t.id, t.name, t.asset_kind::text AS asset_kind, t.standard::text AS standard,
            t.price_brlt::text AS price_brlt, t.status::text AS status, t.token_address, t.created_at
       FROM rwa.tokens t
      WHERE lower(t.created_by) = lower($1)
      ORDER BY t.created_at DESC`,
    [wallet],
  );
  return rows;
}
