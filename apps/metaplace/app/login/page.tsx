import { renderMessage } from "@rwa/wallet-messages";

export const metadata = { title: "Entrar · Barlo Metaplace" };

/** Placeholder de C1: la sesión SIWE real se implementa con `/api/auth/*`. */
export default function LoginPage() {
  const sample = renderMessage("identity.create", "es", {});
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
        {sample.title}
        {"\n\n"}
        {sample.text}
      </pre>
      <p style={{ color: "#66739a", fontSize: 12 }}>
        El flujo SIWE (nonce → firma → verificación → sesión) se conecta en C1.
      </p>
    </main>
  );
}
