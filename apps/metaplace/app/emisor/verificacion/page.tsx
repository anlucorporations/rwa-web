"use client";

import { useCallback, useEffect, useState } from "react";

interface Claim { id: string; requester_wallet: string; credential_code: string; program_name: string; display_alias: string }

export default function VerificacionPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/review-queue?status=pending");
    if (!response.ok) {
      setError(response.status === 403 ? "Necesitas rol Operador o Admin." : "No se pudo cargar la cola.");
      return;
    }
    const body = (await response.json()) as { data?: Claim[] };
    setClaims(body.data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function verify(id: string) {
    setMessage(null); setError(null);
    const response = await fetch(`/api/claims/${id}/verify`, { method: "POST" });
    const body = (await response.json()) as { error?: { message: string } };
    if (!response.ok) { setError(body.error?.message ?? "No se pudo verificar."); return; }
    setMessage("Documentos verificados; pasa al Emisor.");
    await load();
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Verificación de documentos</h1>
      <p style={{ color: "#a9b4cc" }}>Cola del Operador: revisa los documentos y marca la solicitud como verificada.</p>
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      {message && <p style={{ color: "#9fd2a8" }}>{message}</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {claims.map((c) => (
          <li key={c.id} style={{ border: "1px solid #202a4d", borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <strong>{c.credential_code}</strong> · {c.program_name} · {c.display_alias}
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={() => verify(c.id)} style={{ background: "#3b6cff", color: "white", border: 0, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
                Marcar documentos verificados
              </button>
            </div>
          </li>
        ))}
      </ul>
      {claims.length === 0 && <p style={{ color: "#a9b4cc" }}>No hay solicitudes pendientes.</p>}
    </main>
  );
}
