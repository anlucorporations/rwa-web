"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Listing {
  id: string; name: string; price_brlt: string; quantity: string; remaining_quantity: string;
  asset_kind: string; issuer_name: string; seller_alias: string;
  on_chain_listing_id: string | null; escrow_tx_hash: string | null; token_id: string;
}

export default function ActivoPage() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [escrowTx, setEscrowTx] = useState("");
  const [assetTx, setAssetTx] = useState("");
  const [buyTx, setBuyTx] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [consumed, setConsumed] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/listings");
    const body = (await response.json()) as { data?: Listing[] };
    const found = (body.data ?? []).find((l) => l.id === params.listingId);
    if (!found) { setError("Publicación no encontrada o cerrada."); return; }
    setListing(found);
  }, [params.listingId]);
  useEffect(() => { void load(); }, [load]);

  async function buy() {
    setError(null);
    setStatus("Firmando la intención de compra…");
    try {
      if (!listing) return;
      const eth = (globalThis as unknown as { ethereum?: { request(a: { method: string; params?: unknown[] }): Promise<unknown> } }).ethereum;
      if (!eth) throw new Error("No se detectó una billetera en el navegador.");
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const message = `Barlo: compro "${listing.name}" por ${listing.price_brlt} BRLT en la publicación ${listing.id}`;
      const signature = (await eth.request({ method: "personal_sign", params: [message, accounts[0]] })) as string;

      let txHash = escrowTx;
      let assetHash = assetTx || listing.escrow_tx_hash || "";
      if (listing.on_chain_listing_id) {
        setStatus("Aprueba y firma la compra en tu wallet…");
        const { buyOnchain } = await import("@/lib/onchain");
        const priceWei = BigInt(Math.round(Number(listing.price_brlt) * 1e8));
        txHash = await buyOnchain(listing.on_chain_listing_id, priceWei);
        setBuyTx(txHash);
      }
      setStatus("Registrando la orden…");
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          escrowTxHash: txHash,
          escrowAssetTxHash: assetHash,
          intentMessage: message,
          intentSignature: signature,
        }),
      });
      const body = (await response.json()) as { data?: { id: string }; error?: { message: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "No se pudo crear la orden.");
      setOrderId(body.data.id);
      setStatus(`Orden creada (${body.data.id.slice(0, 8)}…). Confirma la recepción para liberar el pago.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setStatus(null);
    }
  }

  async function confirm() {
    if (!listing || !orderId) return;
    setError(null);
    try {
      if (listing.on_chain_listing_id) {
        setStatus("Confirma la recepción en tu wallet…");
        const { confirmOnchain } = await import("@/lib/onchain");
        await confirmOnchain(listing.on_chain_listing_id);
      }
      const response = await fetch(`/api/orders/${orderId}/confirm`, { method: "POST" });
      const body = (await response.json()) as { error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "No se pudo confirmar.");
      setStatus("Recepción confirmada y pago liberado al vendedor.");
      setTimeout(() => router.push("/catalogo"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    }
  }

  async function consume() {
    if (!listing) return;
    setError(null);
    try {
      const response = await fetch(`/api/services/${listing.token_id}/consume`, { method: "POST" });
      const body = (await response.json()) as { error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "No se pudo consumir el servicio.");
      setConsumed(true);
      setStatus("Servicio consumido. ¡Gracias!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    }
  }

  const input: React.CSSProperties = { background: "#0b1020", color: "#e8ecf7", border: "1px solid #33406b", borderRadius: 8, padding: "8px 10px", width: "100%", marginBottom: 8, fontSize: 12 };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Detalle del activo</h1>
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      {listing && (
        <section style={{ border: "1px solid #202a4d", borderRadius: 12, padding: 20, background: "#121936" }}>
          <h2 style={{ marginTop: 0 }}>{listing.name}</h2>
          <p style={{ color: "#a9b4cc", margin: "0 0 4px" }}>{listing.issuer_name} · vendedor {listing.seller_alias}</p>
          <p style={{ fontSize: 22, margin: "8px 0" }}><strong>{listing.price_brlt} BRLT</strong></p>
          <p style={{ color: "#66739a", fontSize: 12 }}>{listing.asset_kind} · quedan {listing.remaining_quantity} de {listing.quantity}</p>
          {listing.on_chain_listing_id ? (
            <>
              <h3 style={{ fontSize: 15 }}>Compra on-chain</h3>
              <p style={{ color: "#a9b4cc", fontSize: 13 }}>
                Publicación on-chain <code>#{listing.on_chain_listing_id}</code>. La billetera firmará
                <em> approve</em> de BRLT y <em>buy</em> del Marketplace; el activo ya está en escrow.
              </p>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: 15 }}>Escrow manual (publicación solo en base de datos)</h3>
              <input style={input} placeholder="tx del escrow BRLT (0x…)" value={escrowTx} onChange={(e) => setEscrowTx(e.target.value)} />
              <input style={input} placeholder="tx de la transferencia del activo (0x…)" value={assetTx} onChange={(e) => setAssetTx(e.target.value)} />
            </>
          )}
          <button type="button" onClick={buy} style={{ marginTop: 12, background: "#3b6cff", color: "white", border: 0, borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>
            {listing.on_chain_listing_id ? "Comprar on-chain" : "Firmar y comprar"}
          </button>
          {consumed && <p style={{ color: "#9fd2a8" }}>Servicio consumido ✔</p>}
          {listing.asset_kind === "service" && !consumed && (
            <button type="button" onClick={consume} style={{ marginTop: 12, marginLeft: 8, background: "#7a5cff", color: "white", border: 0, borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>
              Usar servicio
            </button>
          )}
          {orderId && (
            <button type="button" onClick={confirm} style={{ marginTop: 12, marginLeft: 8, background: "#2f8f5b", color: "white", border: 0, borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>
              Confirmar recepción
            </button>
          )}
          {status && <p style={{ color: "#9fd2a8" }}>{status}</p>}
          {buyTx && <p style={{ color: "#66739a", fontSize: 12 }}>tx compra: <code>{buyTx}</code></p>}
        </section>
      )}
    </main>
  );
}
