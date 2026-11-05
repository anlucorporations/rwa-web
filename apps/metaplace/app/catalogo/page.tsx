"use client";

import { useEffect, useState } from "react";

interface Item {
  id: string; name: string; asset_kind: string; standard: string;
  price_brlt: string; metadata_uri: string | null; issuer_name: string; issuer_alias: string | null;
}

export default function CatalogoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then(async (r) => {
        const body = (await r.json()) as { data?: Item[]; error?: { message: string } };
        if (!r.ok) throw new Error(body.error?.message ?? "No se pudo cargar el catálogo.");
        setItems(body.data ?? []);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Catálogo</h1>
      <p style={{ color: "#a9b4cc" }}>Activos tokenizados por ISSUER verificados. Precios en BRLT (sin valor real).</p>
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      {items.length === 0 && !error && <p style={{ color: "#a9b4cc" }}>Aún no hay activos publicados.</p>}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
        {items.map((item) => (
          <article key={item.id} style={{ border: "1px solid #202a4d", borderRadius: 12, padding: 16, background: "#121936" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 17 }}>{item.name}</h2>
            <p style={{ color: "#a9b4cc", fontSize: 13, margin: "0 0 8px" }}>
              {item.issuer_name}{item.issuer_alias ? ` · ${item.issuer_alias}` : ""}
            </p>
            <p style={{ margin: "0 0 4px" }}><strong>{item.price_brlt} BRLT</strong></p>
            <p style={{ color: "#66739a", fontSize: 12, margin: 0 }}>
              {item.asset_kind} · {item.standard}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
