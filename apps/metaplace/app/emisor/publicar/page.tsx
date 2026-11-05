"use client";

import { useCallback, useEffect, useState } from "react";

interface Asset { id: string; name: string; asset_kind: string; price_brlt: string; status: string }

export default function PublicarPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/assets");
    if (!response.ok) { setError("Necesitas rol Emisor o Admin."); return; }
    const body = (await response.json()) as { data?: Asset[] };
    setAssets(body.data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function publish() {
    setError(null); setMessage(null);
    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId, priceBrlt: price, quantity: Number(quantity) }),
    });
    const body = (await response.json()) as { error?: { message: string } };
    if (!response.ok) { setError(body.error?.message ?? "No se pudo publicar."); return; }
    setMessage("Activo publicado a precio fijo.");
  }

  const input: React.CSSProperties = { background: "#0b1020", color: "#e8ecf7", border: "1px solid #33406b", borderRadius: 8, padding: "8px 10px", width: "100%", marginBottom: 8 };
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Publicar activo</h1>
      <p style={{ color: "#a9b4cc" }}>Publica uno de tus activos a precio fijo en BRLT.</p>
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      {message && <p style={{ color: "#9fd2a8" }}>{message}</p>}
      <select style={input} value={tokenId} onChange={(e) => setTokenId(e.target.value)}>
        <option value="">Selecciona un activo…</option>
        {assets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.asset_kind})</option>)}
      </select>
      <input style={input} placeholder="Precio en BRLT (ej. 1250.50)" value={price} onChange={(e) => setPrice(e.target.value)} />
      <input style={input} placeholder="Cantidad" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      <button type="button" onClick={publish} style={{ background: "#3b6cff", color: "white", border: 0, borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>
        Publicar a precio fijo
      </button>
    </main>
  );
}
