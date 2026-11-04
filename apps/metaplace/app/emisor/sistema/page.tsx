"use client";

import { useCallback, useEffect, useState } from "react";

interface Snapshot {
  database: string;
  counts: Record<string, string>;
  indexer: { last_block: string; updated_at: string | null } | null;
  recentAudit: { action: string; resource_type: string; created_at: string }[];
}

export default function SistemaPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/system");
    if (!response.ok) { setError(response.status === 403 ? "Solo Admin o Auditor pueden ver el Sistema." : "No se pudo cargar."); return; }
    setData(((await response.json()) as { data?: Snapshot }).data ?? null);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Sistema</h1>
      <p style={{ color: "#a9b4cc" }}>Salud, colas y actividad reciente. Solo lectura para el Auditor.</p>
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      {data && (
        <>
          <p>Base de datos: <strong style={{ color: data.database === "ok" ? "#9fd2a8" : "#ff8f8f" }}>{data.database}</strong></p>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
            {Object.entries(data.counts ?? {}).map(([key, value]) => (
              <div key={key} style={{ border: "1px solid #202a4d", borderRadius: 10, padding: 14, background: "#121936" }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
                <div style={{ color: "#a9b4cc", fontSize: 12 }}>{key}</div>
              </div>
            ))}
          </section>
          <h2 style={{ fontSize: 18, marginTop: 28 }}>Indexer</h2>
          <p style={{ color: "#a9b4cc" }}>Último bloque: {data.indexer?.last_block ?? "—"} · actualizado: {data.indexer?.updated_at ?? "—"}</p>
          <h2 style={{ fontSize: 18, marginTop: 28 }}>Actividad reciente</h2>
          <ul style={{ listStyle: "none", padding: 0, fontSize: 13 }}>
            {(data.recentAudit ?? []).map((a, i) => (
              <li key={i} style={{ borderTop: "1px solid #202a4d", padding: "8px 0" }}>
                <code>{a.action}</code> · {a.resource_type} · {new Date(a.created_at).toLocaleString("es")}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
