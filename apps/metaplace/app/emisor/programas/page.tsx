"use client";

import { useCallback, useEffect, useState } from "react";

interface Program {
  id: string; slug: string; name: string; description: string | null; active: boolean;
  credentials: { code: string; name: string }[];
  requirements: { kind: string; label: string; credential_code: string | null; required: boolean }[];
}

const input: React.CSSProperties = { background: "#0b1020", color: "#e8ecf7", border: "1px solid #33406b", borderRadius: 8, padding: "8px 10px", width: "100%", marginBottom: 8 };
const primary: React.CSSProperties = { background: "#3b6cff", color: "white", border: 0, borderRadius: 8, padding: "10px 16px", cursor: "pointer" };

export default function ProgramasPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [credentials, setCredentials] = useState("KYC");
  const [docLabel, setDocLabel] = useState("Documento de identidad");
  const [requireCredential, setRequireCredential] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/issuer-programs?all=1");
    if (!response.ok) { setError(response.status === 403 ? "Solo un Admin puede gestionar ISSUER." : "No se pudo cargar."); return; }
    setPrograms(((await response.json()) as { data?: Program[] }).data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    setError(null);
    const body = {
      slug, name,
      credentials: credentials.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
      requirements: [
        { kind: "document", label: docLabel, required: true },
        ...(requireCredential ? [{ kind: "credential", label: `Tener ${requireCredential}`, credentialCode: requireCredential.toUpperCase(), required: true }] : []),
      ],
    };
    const response = await fetch("/api/admin/issuer-programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const parsed = (await response.json()) as { error?: { message: string } };
    if (!response.ok) { setError(parsed.error?.message ?? "No se pudo crear el ISSUER."); return; }
    setSlug(""); setName(""); setRequireCredential("");
    await load();
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/admin/issuer-programs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    await load();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      <h1>ISSUER</h1>
      <p style={{ color: "#a9b4cc" }}>Programas de certificación: proceso, requisitos y claims que emiten.</p>
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
        {programs.map((p) => (
          <article key={p.id} style={{ border: "1px solid #202a4d", borderRadius: 12, padding: 16, background: "#121936", opacity: p.active ? 1 : 0.6 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>{p.name}</h2>
            <code style={{ color: "#7aa2ff", fontSize: 12 }}>{p.slug}</code>
            <p style={{ color: "#a9b4cc", fontSize: 13 }}>{p.description}</p>
            <p style={{ fontSize: 13 }}>Claims: {p.credentials.map((c) => c.code).join(", ") || "—"}</p>
            <p style={{ fontSize: 12, color: "#66739a" }}>Requisitos: {p.requirements.length}</p>
            <button type="button" style={primary} onClick={() => toggle(p.id, !p.active)}>{p.active ? "Desactivar" : "Activar"}</button>
          </article>
        ))}
      </section>

      <section style={{ marginTop: 32, border: "1px solid #202a4d", borderRadius: 12, padding: 20, background: "#121936" }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Nuevo ISSUER</h2>
        <input style={input} placeholder="slug (p. ej. turismo)" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <input style={input} placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={input} placeholder="Claims que emite (CSV: KYC,SOCIO…)" value={credentials} onChange={(e) => setCredentials(e.target.value)} />
        <input style={input} placeholder="Documento obligatorio" value={docLabel} onChange={(e) => setDocLabel(e.target.value)} />
        <input style={input} placeholder="Claim previo exigido (opcional: KYC)" value={requireCredential} onChange={(e) => setRequireCredential(e.target.value)} />
        <button type="button" style={primary} onClick={create}>Crear ISSUER</button>
      </section>
    </main>
  );
}
