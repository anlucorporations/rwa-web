/** Consumo de servicios (CU-25): quemado lógico tras una compra confirmada. */
import { ConflictError, ForbiddenError, NotFoundError, query, withTransaction } from "@rwa/shared";

async function identityOf(wallet: string): Promise<string | null> {
  const { rows } = await query<{ id: string }>(
    "SELECT id FROM rwa.identities WHERE lower(wallet_address) = lower($1)",
    [wallet],
  );
  return rows[0]?.id ?? null;
}

export async function consumeService(tokenId: string, wallet: string) {
  const identityId = await identityOf(wallet);
  if (!identityId) throw new ForbiddenError("Necesitas identidad y SOCIO para usar servicios");

  const socio = await query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM rwa.claim_requests cr
        JOIN rwa.credential_types ct ON ct.id = cr.credential_type_id
       WHERE cr.identity_id = $1 AND ct.code = 'SOCIO' AND cr.status = 'approved'
     ) AS ok`,
    [identityId],
  );
  if (!socio.rows[0]?.ok) throw new ForbiddenError("Necesitas el certificado SOCIO para usar servicios");

  const token = await query<{ id: string; asset_kind: string; status: string; name: string }>(
    "SELECT id, asset_kind::text AS asset_kind, status::text AS status, name FROM rwa.tokens WHERE id = $1",
    [tokenId],
  );
  if (!token.rows[0]) throw new NotFoundError("Activo", tokenId);
  if (token.rows[0].asset_kind !== "service") throw new ConflictError("El activo no es un servicio");

  const purchased = await query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM rwa.orders o
        JOIN rwa.listings l ON l.id = o.listing_id
       WHERE l.token_id = $1 AND o.buyer_identity_id = $2 AND o.status = 'confirmed'
     ) AS ok`,
    [tokenId, identityId],
  );
  if (!purchased.rows[0]?.ok) throw new ConflictError("Necesitas una compra confirmada de este servicio");

  // El estado `sold_out` lo fija el trigger de inventario al confirmar la orden, por lo que
  // el consumo se marca con el evento de auditoría (idempotente) y no por el estado del token.
  const already = await query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM rwa.audit_log
        WHERE action = 'service.consumed' AND resource_type = 'token' AND resource_id = $1
     ) AS ok`,
    [tokenId],
  );
  if (already.rows[0]?.ok) throw new ConflictError("El servicio ya fue consumido");

  return withTransaction(async (client) => {
    await client.query("UPDATE rwa.tokens SET status = 'sold_out' WHERE id = $1", [tokenId]);
    await client.query(
      `INSERT INTO rwa.audit_log (actor_wallet, action, resource_type, resource_id, metadata)
       VALUES (lower($1), 'service.consumed', 'token', $2, $3::jsonb)`,
      [wallet, tokenId, JSON.stringify({ name: token.rows[0].name })],
    );
    return { tokenId, consumed: true, tokenName: token.rows[0].name };
  });
}
