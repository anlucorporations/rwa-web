"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Listing {
  id: string; name: string; price_brlt: string; quantity: string; remaining_quantity: string;
  asset_kind: string; issuer_name: string; seller_alias: string;
}

export default function ActivoPage() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [escrowTx, setEscrowTx] = useState("");
  const [assetTx, setAssetTx] = useState("");

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
      setStatus("Registrando la orden…");
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          escrowTxHash: escrowTx,
          escrowAssetTxHash: assetTx,
          intentMessage: message,
          intentSignature: signature,
        }),
      });
      const body = (await response.json()) as { data?: { id: string }; error?: { message: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "No se pudo crear la orden.");
      setStatus(`Orden creada (${body.data.id.slice(0, 8)}…). Revisa su estado en el panel.`);
      setTimeout(() => router.push("/catalogo"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setStatus(null);
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
          <h3 style={{ fontSize: 15 }}>Escrow on-chain</h3>
          <input style={input} placeholder="tx del escrow BRLT (0x…)" value={escrowTx} onChange={(e) => setEscrowTx(e.target.value)} />
          <input style={input} placeholder="tx de la transferencia del activo (0x…)" value={assetTx} onChange={(e) => setAssetTx(e.target.value)} />
          <button type="button" onClick={buy} style={{ marginTop: 12, background: "#3b6cff", color: "white", border: 0, borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>
            Firmar y comprar
          </button>
          {status && <p style={{ color: "#9fd2a8" }}>{status}</p>}
        </section>
      )}
    </main>
  );
}
