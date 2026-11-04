"use client";

import { useCallback, useEffect, useState } from "react";

interface Claim { id: string; requester_wallet: string; credential_code: string; program_name: string; display_alias: string }

export default function SolicitudesPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/review-queue?status=documents_verified");
    if (!response.ok) {
      setError(response.status === 403 ? "Necesitas rol Emisor o Admin." : "No se pudo cargar la cola.");
      return;
    }
    const body = (await response.json()) as { data?: Claim[] };
    setClaims(body.data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function issue(id: string) {
    setError(null); setMessage(null);
    try {
      const typedRes = await fetch(`/api/claims/${id}/typed-data`);
      const typedBody = (await typedRes.json()) as { data?: Record<string, unknown>; error?: { message: string } };
      if (!typedRes.ok || !typedBody.data) throw new Error(typedBody.error?.message ?? "No se pudo preparar la firma.");
      const eth = (globalThis as unknown as { ethereum?: { request(a: { method: string; params?: unknown[] }): Promise<unknown> } }).ethereum;
      if (!eth) throw new Error("No se detectó una billetera.");
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const signature = (await eth.request({
        method: "eth_signTypedData_v4",
        params: [accounts[0], JSON.stringify(typedBody.data)],
      })) as string;
      const response = await fetch(`/api/claims/${id}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      const body = (await response.json()) as { error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "No se pudo emitir.");
      setMessage("Certificado emitido.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Solicitudes para emitir</h1>
      <p style={{ color: "#a9b4cc" }}>Cola del Emisor: solicitudes verificadas listas para firmar y emitir.</p>
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      {message && <p style={{ color: "#9fd2a8" }}>{message}</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {claims.map((c) => (
          <li key={c.id} style={{ border: "1px solid #202a4d", borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <strong>{c.credential_code}</strong> · {c.program_name} · {c.display_alias}
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={() => issue(c.id)} style={{ background: "#3b6cff", color: "white", border: 0, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
                Firmar y emitir
              </button>
            </div>
          </li>
        ))}
      </ul>
      {claims.length === 0 && <p style={{ color: "#a9b4cc" }}>No hay solicitudes verificadas.</p>}
    </main>
  );
}
