/**
 * Metaplace C4: publicaciones a precio fijo, órdenes con escrow, disputas y arbitraje.
 * El estado de fondos/activo se refleja en `listings`, `orders`, `payments` y `disputes`;
 * el contrato `Marketplace` es la fuente on-chain (tx hashes obligatorios al confirmar).
 */
import { ConflictError, ForbiddenError, NotFoundError, query, ValidationError, withTransaction } from "@rwa/shared";
import { recoverMessageAddress } from "viem";
import type { Hex } from "viem";

import { chainVerificationEnabled, verifyEscrowTx } from "./chain";
import { recordAudit } from "./audit";

const TX = /^0x[0-9a-fA-F]{64}$/;

async function identityOf(wallet: string): Promise<string> {
  const { rows } = await query<{ id: string }>(
    "SELECT id FROM rwa.identities WHERE lower(wallet_address) = lower($1)",
    [wallet],
  );
  if (!rows[0]) throw new ValidationError("Crea tu identidad antes de operar en el Metaplace", "identity");
  return rows[0].id;
}

export async function hasApprovedClaim(identityId: string, code: string): Promise<boolean> {
  const { rows } = await query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM rwa.claim_requests cr
        JOIN rwa.credential_types ct ON ct.id = cr.credential_type_id
       WHERE cr.identity_id = $1 AND ct.code = $2 AND cr.status = 'approved'
     ) AS ok`,
    [identityId, code],
  );
  return Boolean(rows[0]?.ok);
}

async function requireSocio(wallet: string): Promise<string> {
  const identityId = await identityOf(wallet);
  if (!(await hasApprovedClaim(identityId, "SOCIO"))) {
    throw new ForbiddenError("Necesitas el certificado SOCIO para operar");
  }
  return identityId;
}

export async function createListing(
  sellerWallet: string,
  tokenId: string,
  priceBrlt: string,
  quantity: number,
  onChain?: { onChainListingId?: string; escrowTxHash?: string },
) {
  if (!/^\d+(\.\d{1,8})?$/.test(priceBrlt) || Number(priceBrlt) <= 0) {
    throw new ValidationError("Precio inválido", "priceBrlt");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) throw new ValidationError("Cantidad inválida", "quantity");
  const sellerIdentity = await requireSocio(sellerWallet);
  if (onChain?.escrowTxHash && !TX.test(onChain.escrowTxHash)) {
    throw new ValidationError("tx del escrow con formato inválido", "escrowTxHash");
  }
  const { rows } = await query<{ id: string }>(
    `INSERT INTO rwa.listings
       (token_id, seller_identity_id, price_brlt, quantity, remaining_quantity, on_chain_listing_id, escrow_tx_hash)
     VALUES ($1, $2, $3, $4, $4, $5, $6) RETURNING id`,
    [tokenId, sellerIdentity, priceBrlt, quantity, onChain?.onChainListingId ?? null, onChain?.escrowTxHash ?? null],
  );
  return rows[0];
}

export async function listActiveListings() {
  const { rows } = await query(
    `SELECT l.id, l.price_brlt::text AS price_brlt, l.quantity::text AS quantity,
            l.remaining_quantity::text AS remaining_quantity, l.status,
            l.on_chain_listing_id::text AS on_chain_listing_id, l.escrow_tx_hash,
            t.id AS token_id, t.name, t.asset_kind::text AS asset_kind, t.metadata_uri,
            ip.name AS issuer_name, i.display_alias AS seller_alias
       FROM rwa.listings l
       JOIN rwa.tokens t ON t.id = l.token_id
       JOIN rwa.issuer_programs ip ON ip.id = t.issuer_program_id
       JOIN rwa.identities i ON i.id = l.seller_identity_id
      WHERE l.status = 'active' AND l.remaining_quantity > 0
      ORDER BY l.created_at DESC LIMIT 60`,
  );
  return rows;
}

/** Texto legible que firma el comprador antes de crear la orden. */
export function orderIntentMessage(tokenName: string, priceBrlt: string, listingId: string): string {
  return `Barlo: compro "${tokenName}" por ${priceBrlt} BRLT en la publicación ${listingId}`;
}

export async function createOrder(
  buyerWallet: string,
  listingId: string,
  tx: { escrowTxHash: string; escrowAssetTxHash: string },
  intent: { signature: string },
) {
  if (!TX.test(tx.escrowTxHash) || (!TX.test(tx.escrowAssetTxHash) && !chainVerificationEnabled())) {
    throw new ValidationError("Se requieren los dos tx hashes del escrow (BRLT + activo)", "escrowTxHash");
  }
  // La intención se exige y el mensaje se reconstruye en servidor (evita replay/alteración).
  if (!intent?.signature) throw new ValidationError("Falta la firma de intención de compra", "signature");
  const listingInfo = await query<{ name: string; price_brlt: string }>(
    `SELECT t.name, l.price_brlt::text AS price_brlt
       FROM rwa.listings l JOIN rwa.tokens t ON t.id = l.token_id
      WHERE l.id = $1`,
    [listingId],
  );
  if (!listingInfo.rows[0]) throw new NotFoundError("Publicación", listingId);
  const canonicalMessage = orderIntentMessage(
    listingInfo.rows[0].name,
    listingInfo.rows[0].price_brlt,
    listingId,
  );
  const signer = await recoverMessageAddress({ message: canonicalMessage, signature: intent.signature as Hex });
  if (signer.toLowerCase() !== buyerWallet.toLowerCase()) {
    throw new ValidationError("La firma de la orden no corresponde a tu wallet", "signature");
  }
  if (chainVerificationEnabled()) {
    try {
      await verifyEscrowTx(tx.escrowTxHash, buyerWallet);
      await verifyEscrowTx(tx.escrowAssetTxHash, buyerWallet);
    } catch (error) {
      const code = (error as Error).message;
      throw new ValidationError(
        code === "TX_FORMAT" ? "tx hash con formato inválido" : "El escrow on-chain no es válido para esta orden",
        "escrowTxHash",
      );
    }
  }
  const buyerIdentity = await requireSocio(buyerWallet);
  return withTransaction(async (client) => {
    const listing = await client.query<{ seller_identity_id: string; price_brlt: string }>(
      "SELECT seller_identity_id, price_brlt::text AS price_brlt FROM rwa.listings WHERE id = $1 AND status = 'active'",
      [listingId],
    );
    if (!listing.rows[0]) throw new NotFoundError("Publicación", listingId);
    const sellerIdentity = listing.rows[0].seller_identity_id;
    if (sellerIdentity === buyerIdentity) throw new ConflictError("No puedes comprar tu propia publicación");
    // Si la publicación es on-chain y no llega la tx del activo, se usa la tx del escrow del listing.
    if (!tx.escrowAssetTxHash) {
      const esc = await client.query<{ escrow_tx_hash: string | null }>(
        "SELECT escrow_tx_hash FROM rwa.listings WHERE id = $1",
        [listingId],
      );
      tx.escrowAssetTxHash = esc.rows[0]?.escrow_tx_hash ?? "";
    }

    const order = await client.query<{ id: string }>(
      `INSERT INTO rwa.orders (listing_id, buyer_identity_id, seller_identity_id, quantity, price_brlt)
       VALUES ($1, $2, $3, 1, $4) RETURNING id`,
      [listingId, buyerIdentity, sellerIdentity, listing.rows[0].price_brlt],
    );
    const orderId = order.rows[0].id;
    await client.query(
      `UPDATE rwa.orders
          SET status = 'escrowed', escrow_tx_hash = $2, escrow_asset_tx_hash = $3, asset_transferred_at = now()
        WHERE id = $1`,
      [orderId, tx.escrowTxHash, tx.escrowAssetTxHash],
    );
    await client.query(
      `INSERT INTO rwa.payments (order_id, payer_identity_id, payee_wallet, kind, amount_brlt, status, tx_hash)
       SELECT $1, $2, i.wallet_address, 'sale', $3, 'pending', $4
         FROM rwa.identities i WHERE i.id = $5`,
      [orderId, buyerIdentity, listing.rows[0].price_brlt, tx.escrowTxHash, sellerIdentity],
    );
    await recordAudit({
      actor: buyerWallet,
      action: "order.created",
      resourceType: "order",
      resourceId: orderId,
      metadata: { listingId, escrowTxHash: tx.escrowTxHash },
    });
    return orderId;
  });
}

async function orderFor(orderId: string) {
  const { rows } = await query<{
    id: string; status: string; buyer_identity_id: string; seller_identity_id: string;
    buyer_wallet: string; seller_wallet: string; price_brlt: string; escrow_tx_hash: string | null;
    escrow_asset_tx_hash: string | null; asset_transferred_at: string | null;
  }>(
    `SELECT o.id, o.status::text AS status, o.buyer_identity_id, o.seller_identity_id,
            bi.wallet_address AS buyer_wallet, si.wallet_address AS seller_wallet,
            o.price_brlt::text AS price_brlt, o.escrow_tx_hash, o.escrow_asset_tx_hash, o.asset_transferred_at
       FROM rwa.orders o
       JOIN rwa.identities bi ON bi.id = o.buyer_identity_id
       JOIN rwa.identities si ON si.id = o.seller_identity_id
      WHERE o.id = $1`,
    [orderId],
  );
  if (!rows[0]) throw new NotFoundError("Orden", orderId);
  return rows[0];
}

export async function confirmOrder(orderId: string, buyerWallet: string) {
  const order = await orderFor(orderId);
  if (order.buyer_wallet.toLowerCase() !== buyerWallet.toLowerCase()) throw new ForbiddenError("Solo el comprador confirma");
  if (order.status !== "escrowed") throw new ConflictError("La orden no está en escrow");
  await withTransaction(async (client) => {
    await client.query("UPDATE rwa.orders SET status = 'confirmed' WHERE id = $1", [orderId]);
    await client.query(
      "UPDATE rwa.payments SET status = 'settled' WHERE order_id = $1 AND kind = 'sale'",
      [orderId],
    );
  });
  await recordAudit({ actor: buyerWallet, action: "order.confirmed", resourceType: "order", resourceId: orderId });
  return orderFor(orderId);
}

export async function openDispute(orderId: string, buyerWallet: string, reason: string) {
  if (!reason || reason.trim().length < 5) throw new ValidationError("Indica el motivo de la disputa (mín. 5)", "reason");
  const order = await orderFor(orderId);
  if (order.buyer_wallet.toLowerCase() !== buyerWallet.toLowerCase()) throw new ForbiddenError("Solo el comprador abre la disputa");
  if (order.status !== "escrowed") throw new ConflictError("La orden no está en escrow");
  await withTransaction(async (client) => {
    await client.query("UPDATE rwa.orders SET status = 'disputed' WHERE id = $1", [orderId]);
    await client.query(
      `INSERT INTO rwa.disputes (order_id, opened_by_identity_id, reason) VALUES ($1, $2, $3)`,
      [orderId, order.buyer_identity_id, reason.trim()],
    );
  });
  await recordAudit({ actor: buyerWallet, action: "order.disputed", resourceType: "order", resourceId: orderId, metadata: { reason: reason.trim() } });
  return orderFor(orderId);
}

export async function resolveDispute(orderId: string, arbiterWallet: string, resolution: "buyer" | "seller", note: string) {
  if (resolution !== "buyer" && resolution !== "seller") throw new ValidationError("Resolución inválida", "resolution");
  if (!note || note.trim().length < 5) throw new ValidationError("Añade una nota de resolución (mín. 5)", "note");
  const order = await orderFor(orderId);
  if (order.status !== "disputed") throw new ConflictError("La orden no está en disputa");
  if (arbiterWallet.toLowerCase() === order.buyer_wallet.toLowerCase()
      || arbiterWallet.toLowerCase() === order.seller_wallet.toLowerCase()) {
    throw new ForbiddenError("El árbitro no puede ser parte de la disputa");
  }
  await withTransaction(async (client) => {
    const disputeStatus = resolution === "buyer" ? "resolved_buyer" : "resolved_seller";
    const { rowCount } = await client.query(
      `UPDATE rwa.disputes
          SET status = $2::rwa.dispute_status, arbiter_wallet = lower($3), resolution = $4, resolved_at = now()
        WHERE order_id = $1 AND status IN ('open', 'in_review')`,
      [orderId, disputeStatus, arbiterWallet, note.trim()],
    );
    if (!rowCount) throw new ConflictError("La disputa ya fue resuelta");
    await client.query(
      "UPDATE rwa.orders SET status = $2::rwa.order_status WHERE id = $1",
      [orderId, resolution === "buyer" ? "refunded" : "confirmed"],
    );
    await client.query(
      "UPDATE rwa.payments SET status = $2::rwa.payment_status WHERE order_id = $1 AND kind = 'sale'",
      [orderId, resolution === "buyer" ? "refunded" : "settled"],
    );
    if (resolution === "buyer") {
      // El reembolso va al comprador: se registra sin `order_id` porque el pago ligado a la
      // orden debe ir siempre a la wallet del vendedor (trigger `validate_payment_payee`).
      await client.query(
        `INSERT INTO rwa.payments (payer_identity_id, payee_wallet, kind, amount_brlt, status)
         SELECT $1, i.wallet_address, 'refund', $2, 'refunded' FROM rwa.identities i WHERE i.id = $1`,
        [order.buyer_identity_id, order.price_brlt],
      );
    }
  });
  await recordAudit({
    actor: arbiterWallet,
    action: resolution === "buyer" ? "dispute.resolved_buyer" : "dispute.resolved_seller",
    resourceType: "order",
    resourceId: orderId,
    metadata: { note: note.trim() },
  });
  return orderFor(orderId);
}

export async function listOrdersFor(wallet: string) {
  const { rows } = await query(
    `SELECT o.id, o.status::text AS status, o.price_brlt::text AS price_brlt, o.created_at,
            o.escrow_tx_hash, o.escrow_asset_tx_hash, o.confirmed_at,
            t.name AS token_name, ip.name AS issuer_name,
            CASE WHEN lower(bi.wallet_address) = lower($1) THEN 'buyer' ELSE 'seller' END AS role
       FROM rwa.orders o
       JOIN rwa.listings l ON l.id = o.listing_id
       JOIN rwa.tokens t ON t.id = l.token_id
       JOIN rwa.issuer_programs ip ON ip.id = t.issuer_program_id
       JOIN rwa.identities bi ON bi.id = o.buyer_identity_id
       JOIN rwa.identities si ON si.id = o.seller_identity_id
      WHERE lower(bi.wallet_address) = lower($1) OR lower(si.wallet_address) = lower($1)
      ORDER BY o.created_at DESC`,
    [wallet],
  );
  return rows;
}
