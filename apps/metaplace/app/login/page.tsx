"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renderMessage } from "@rwa/wallet-messages";

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function getProvider(): EthereumProvider {
  const ethereum = (globalThis as unknown as { ethereum?: EthereumProvider }).ethereum;
  if (!ethereum) {
    throw new Error("No se detectó una billetera en el navegador (instala MetaMask o similar).");
  }
  return ethereum;
}

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "connecting" | "signing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const info = renderMessage("identity.create", "es", {});

  async function signIn() {
    setError(null);
    try {
      setStatus("connecting");
      const provider = getProvider();
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const address = accounts[0];
      if (!address) throw new Error("La billetera no devolvió ninguna cuenta.");

      setStatus("signing");
      const nonceResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const nonceBody = (await nonceResponse.json()) as {
        success: boolean;
        data?: { message: string };
        error?: { message: string };
      };
      if (!nonceResponse.ok || !nonceBody.data) {
        throw new Error(nonceBody.error?.message ?? "No se pudo crear el reto de firma.");
      }

      const signature = (await provider.request({
        method: "personal_sign",
        params: [nonceBody.data.message, address],
      })) as string;

      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: nonceBody.data.message, signature }),
      });
      if (!verifyResponse.ok) {
        const verifyBody = (await verifyResponse.json()) as { error?: { message: string } };
        throw new Error(verifyBody.error?.message ?? "La firma no fue válida.");
      }

      setStatus("done");
      router.push("/identidad");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al iniciar sesión.");
      setStatus("idle");
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Entrar con tu wallet</h1>
      <p style={{ color: "#a9b4cc" }}>
        Firmarás un mensaje para identificarte. No se comparte tu saldo ni tus datos.
      </p>
      <pre
        style={{
          background: "#121936",
          border: "1px solid #202a4d",
          borderRadius: 10,
          padding: 16,
          whiteSpace: "pre-wrap",
          color: "#dbe4ff",
        }}
      >
        {info.title}
        {"\n\n"}
        {info.text}
      </pre>
      <button
        type="button"
        onClick={signIn}
        disabled={status === "connecting" || status === "signing"}
        style={{
          background: "#3b6cff",
          color: "white",
          border: 0,
          borderRadius: 8,
          padding: "12px 20px",
          cursor: "pointer",
          opacity: status === "idle" || status === "done" ? 1 : 0.6,
        }}
      >
        {status === "connecting"
          ? "Conectando…"
          : status === "signing"
            ? "Firmando…"
            : "Conectar y firmar"}
      </button>
      {error && <p style={{ color: "#ff8f8f", marginTop: 16 }}>{error}</p>}
    </main>
  );
}
