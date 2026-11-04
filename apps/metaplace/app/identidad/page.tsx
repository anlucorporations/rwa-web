import Link from "next/link";
import Wizard from "./Wizard";

export const metadata = { title: "Mi identidad · Barlo Metaplace" };

export default function IdentidadPage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Mi identidad</h1>
      <p style={{ color: "#a9b4cc" }}>
        Completa los 4 pasos para operar en el Metaplace. Tu wallet no se publica: solo tu alias.
      </p>
      <Wizard />
      <p style={{ marginTop: 32 }}>
        <Link href="/identidad/claims" style={{ color: "#7aa2ff" }}>Ver mis certificados</Link>
        {"  ·  "}
        <Link href="/catalogo" style={{ color: "#7aa2ff" }}>Catálogo</Link>
      </p>
    </main>
  );
}
