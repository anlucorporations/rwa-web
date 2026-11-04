"use client";

import { useCallback, useEffect, useState } from "react";

interface Role {
  id: string; wallet_address: string; role: string; scope: string;
  issuer_program_slug: string | null; granted_at: string; revoked_at: string | null; reason: string | null;
}

const input: React.CSSProperties = { background: "#0b1020", color: "#e8ecf7", border: "1px solid #33406b", borderRadius: 8, padding: "8px 10px", width: "100%", marginBottom: 8 };
const primary: React.CSSProperties = { background: "#3b6cff", color: "white", border: 0, borderRadius: 8, padding: "10px 16px", cursor: "pointer" };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState("");
  const [role, setRole] = useState("operator");
  const [scope, setScope] = useState<"platform" | "issuer_program">("platform");
  const [programSlug, setProgramSlug] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/roles");
    if (!response.ok) { setError(response.status === 403 ? "Solo un Admin puede gestionar roles." : "No se pudo cargar."); return; }
    setRoles(((await response.json()) as { data?: Role[] }).data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function grant() {
    setError(null);
    const response = await fetch("/api/admin/roles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, role, scope, issuerProgramSlug: scope === "issuer_program" ? programSlug : undefined, reason }),
    });
    if (!response.ok) { setError(((await response.json()) as { error?: { message: string } }).error?.message ?? "No se pudo conceder."); return; }
    setWallet(""); setReason("");
    await load();
  }

  async function revoke(id: string) {
    await fetch(`/api/admin/roles/${id}/revoke`, { method: "POST" });
    await load();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Roles</h1>
      <p style={{ color: "#a9b4cc" }}>Principales y roles por ámbito (`platform` / `issuer_program`). Efecto inmediato al revocar.</p>
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      <section style={{ border: "1px solid #202a4d", borderRadius: 12, padding: 20, background: "#121936", marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Conceder rol</h2>
        <input style={input} placeholder="0x… wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} />
        <select style={input} value={role} onChange={(e) => setRole(e.target.value)}>
          {["admin", "issuer", "operator", "auditor", "arbiter", "support"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select style={input} value={scope} onChange={(e) => setScope(e.target.value as "platform" | "issuer_program")}>
          <option value="platform">platform</option>
          <option value="issuer_program">issuer_program</option>
        </select>
        {scope === "issuer_program" && <input style={input} placeholder="slug del programa" value={programSlug} onChange={(e) => setProgramSlug(e.target.value)} />}
        <input style={input} placeholder="motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="button" style={primary} onClick={grant}>Conceder</button>
      </section>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ textAlign: "left", color: "#a9b4cc" }}><th>Wallet</th><th>Rol</th><th>Ámbito</th><th>Estado</th><th /></tr></thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #202a4d" }}>
              <td style={{ padding: "8px 4px" }}><code>{`${r.wallet_address.slice(0, 8)}…${r.wallet_address.slice(-4)}`}</code></td>
              <td>{r.role}</td>
              <td>{r.scope}{r.issuer_program_slug ? `:${r.issuer_program_slug}` : ""}</td>
              <td style={{ color: r.revoked_at ? "#ff8f8f" : "#9fd2a8" }}>{r.revoked_at ? "revocado" : "vigente"}</td>
              <td>{!r.revoked_at && <button type="button" onClick={() => revoke(r.id)} style={{ ...primary, padding: "4px 10px", background: "#5a2733" }}>Revocar</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
