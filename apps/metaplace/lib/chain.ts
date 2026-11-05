/**
 * Verificación on-chain de transacciones (C4): confirma que los tx hashes del
 * escrow existen en la red canónica, terminaron con éxito y van al Marketplace.
 */
import { createPublicClient, http, type Hex } from "viem";
import { getNetworkConfig } from "@rwa/shared";

export const MARKETPLACE_ADDRESS = (process.env.MARKETPLACE_ADDRESS ??
  "0x8b79fa806Afacf81889fdfFf610E555844583F01") as `0x${string}`;

export interface TxCheck {
  hash: string;
  from: string;
  to: string | null;
  status: "success" | "reverted";
}

export function chainVerificationEnabled(): boolean {
  return process.env.CHAIN_VERIFY_TX === "1";
}

function client() {
  const network = getNetworkConfig();
  return createPublicClient({ transport: http(network.rpcUrl) });
}

/** Verifica un tx hash del escrow. Lanza ValidationError si no es válido. */
export async function verifyEscrowTx(hash: string, expectedFrom: string): Promise<TxCheck> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    throw new Error("TX_FORMAT");
  }
  const client_ = client();
  const receipt = await client_.getTransactionReceipt({ hash: hash as Hex });
  const tx = await client_.getTransaction({ hash: hash as Hex });
  if (receipt.status !== "success") throw new Error("TX_REVERTED");
  if (tx.from.toLowerCase() !== expectedFrom.toLowerCase()) throw new Error("TX_FROM_MISMATCH");
  if (!receipt.to || receipt.to.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
    throw new Error("TX_NOT_MARKETPLACE");
  }
  return { hash, from: tx.from, to: receipt.to, status: "success" };
}
