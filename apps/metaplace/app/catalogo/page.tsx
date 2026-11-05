"use client";

import { useEffect, useState } from "react";

interface Item {
  id: string; name: string; asset_kind: string; standard: string;
  price_brlt: string; metadata_uri: string | null; issuer_name: string; issuer_alias: string | null;
}
interface Listing {
  id: string; name: string; price_brlt: string; remaining_quantity: string;
  issuer_name: string; seller_alias: string;
}

export default function CatalogoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/catalog"), fetch("/api/listings")])
      .then(async ([c, l]) => {
        const body = (await c.json()) as { data?: Item[]; error?: { message: string } };
        if (!c.ok) throw new Error(body.error?.message ?? "No se pudo cargar el catálogo.");
        setItems(body.data ?? []);
        const lb = (await l.json()) as { data?: Listing[] };
        setListings(lb.data ?? []);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Catálogo</h1>
      <p style={{ color: "#a9b4cc" }}>Activos tokenizados por ISSUER verificados. Precios en BRLT (sin valor real).</p>
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      {items.length === 0 && !error && <p style={{ color: "#a9b4cc" }}>Aún no hay activos publicados.</p>}
      {listings.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 28 }}>En venta ahora</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {listings.map((l) => (
              <li key={l.id} style={{ border: "1px solid #202a4d", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <strong>{l.name}</strong> · {l.price_brlt} BRLT · vendedor {l.seller_alias} · quedan {l.remaining_quantity}
                <a href={`/activo/${l.id}`} style={{ marginLeft: 12, color: "#7aa2ff" }}>Ver y comprar</a>
              </li>
            ))}
          </ul>
        </>
      )}
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
