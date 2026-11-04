"use client";

import { useCallback, useEffect, useState } from "react";

interface Program { id: string; slug: string; name: string; credentials: { code: string; name: string }[] }
interface Claim { id: string; status: string; credential_code: string; program_name: string; created_at: string }

interface EthereumProvider { request(args: { method: string; params?: unknown[] }): Promise<unknown> }
function provider(): EthereumProvider {
  const eth = (globalThis as unknown as { ethereum?: EthereumProvider }).ethereum;
  if (!eth) throw new Error("No se detectó una billetera en el navegador.");
  return eth;
}

export default function ClaimsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [slug, setSlug] = useState("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([fetch("/api/issuer-programs"), fetch("/api/claims")]);
    const pBody = (await pRes.json()) as { data?: Program[] };
    const cBody = (await cRes.json()) as { data?: Claim[] };
    setPrograms(pBody.data ?? []);
    setClaims(cBody.data ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = programs.find((p) => p.slug === slug);

  async function submit() {
    setError(null);
    setStatus("Firmando…");
    try {
      if (!file || !slug || !code) throw new Error("Completa ISSUER, certificado y documento.");
      const accounts = (await provider().request({ method: "eth_requestAccounts" })) as string[];
      const address = accounts[0];
      const session = await fetch("/api/auth/session");
      if (!session.ok) throw new Error("Debes iniciar sesión antes de solicitar un certificado.");
      const identityRes = await fetch("/api/identity");
      const identityBody = (await identityRes.json()) as { data?: { id: string } };
      if (!identityBody.data) throw new Error("Primero crea tu identidad en /identidad.");
      const message = `Barlo: solicito el certificado ${code} para ${identityBody.data.id}`;
      const signature = (await provider().request({
        method: "personal_sign",
        params: [message, address],
      })) as string;
      setStatus("Subiendo…");
      const form = new FormData();
      form.set("programSlug", slug);
      form.set("credentialCode", code);
      form.set("requesterSignature", signature);
      form.set("file", file);
      const response = await fetch("/api/claims", { method: "POST", body: form });
      const body = (await response.json()) as { error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "No se pudo crear la solicitud.");
      setStatus("Solicitud enviada. El Operador revisará tus documentos.");
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setStatus(null);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Mis certificados</h1>
      <p style={{ color: "#a9b4cc" }}>Solicita un certificado a un emisor y adjunta los documentos requeridos.</p>

      <section style={{ background: "#121936", border: "1px solid #202a4d", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Nueva solicitud</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select value={slug} onChange={(e) => { setSlug(e.target.value); setCode(""); }} style={input}>
            <option value="">ISSUER…</option>
            {programs.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
          </select>
          <select value={code} onChange={(e) => setCode(e.target.value)} style={input} disabled={!selected}>
            <option value="">Certificado…</option>
            {selected?.credentials.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
          </select>
          <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button type="button" onClick={submit} style={button}>Solicitar certificado</button>
        {status && <p style={{ color: "#9fd2a8" }}>{status}</p>}
        {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      </section>

      <h2 style={{ fontSize: 18 }}>Historial</h2>
      {claims.length === 0 && <p style={{ color: "#a9b4cc" }}>Aún no tienes solicitudes.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {claims.map((c) => (
          <li key={c.id} style={{ border: "1px solid #202a4d", borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <strong>{c.credential_code}</strong> · {c.program_name} — <span style={{ color: "#7aa2ff" }}>{c.status}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

const input: React.CSSProperties = { background: "#0b1020", color: "#e8ecf7", border: "1px solid #33406b", borderRadius: 8, padding: "8px 10px" };
const button: React.CSSProperties = { marginTop: 14, background: "#3b6cff", color: "white", border: 0, borderRadius: 8, padding: "10px 18px", cursor: "pointer" };
