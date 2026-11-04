"use client";

import { useCallback, useEffect, useState } from "react";

interface Identity {
  id: string;
  display_alias: string;
  status: string;
  kyc_level: number;
}

export default function IdentidadPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionResponse = await fetch("/api/auth/session");
      if (sessionResponse.status === 401) {
        setLoading(false);
        return;
      }
      const sessionBody = (await sessionResponse.json()) as {
        data?: { address: string };
        error?: { message: string };
      };
      if (!sessionResponse.ok || !sessionBody.data) {
        throw new Error(sessionBody.error?.message ?? "Sesión no válida.");
      }
      setAddress(sessionBody.data.address);

      const identityResponse = await fetch("/api/identity");
      if (identityResponse.status === 404) {
        setIdentity(null);
        return;
      }
      const identityBody = (await identityResponse.json()) as { data?: Identity };
      if (!identityResponse.ok || !identityBody.data) throw new Error("No se pudo leer la identidad.");
      setIdentity(identityBody.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setError(null);
    const response = await fetch("/api/identity", { method: "POST" });
    const body = (await response.json()) as { data?: Identity; error?: { message: string } };
    if (!response.ok || !body.data) {
      setError(body.error?.message ?? "No se pudo crear la identidad.");
      return;
    }
    setIdentity(body.data);
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Mi identidad</h1>
      {loading && <p style={{ color: "#a9b4cc" }}>Cargando…</p>}
      {!loading && !address && (
        <p style={{ color: "#a9b4cc" }}>
          Necesitas iniciar sesión. <a href="/login" style={{ color: "#7aa2ff" }}>Entrar con wallet</a>
        </p>
      )}
      {address && (
        <p style={{ color: "#a9b4cc" }}>
          Wallet autenticada: <code>{`${address.slice(0, 6)}…${address.slice(-4)}`}</code>
        </p>
      )}
      {address && !identity && (
        <button
          type="button"
          onClick={create}
          style={{ background: "#3b6cff", color: "white", border: 0, borderRadius: 8, padding: "12px 20px" }}
        >
          Crear mi identidad
        </button>
      )}
      {identity && (
        <section
          style={{ background: "#121936", border: "1px solid #202a4d", borderRadius: 12, padding: 20 }}
        >
          <h2 style={{ marginTop: 0 }}>{identity.display_alias}</h2>
          <p style={{ color: "#a9b4cc", margin: 0 }}>
            Estado: {identity.status} · Nivel KYC: {identity.kyc_level}
          </p>
          <p style={{ color: "#66739a", fontSize: 12, marginBottom: 0 }}>
            Tu wallet no se muestra en el Metaplace. Los certificados se solicitan en el siguiente paso.
          </p>
        </section>
      )}
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
    </main>
  );
}
