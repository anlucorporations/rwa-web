import Link from "next/link";

const SUITES = [
  {
    href: "/identidad",
    title: "Identidad",
    description: "Crea tu identidad única y solicita tus certificados (KYC, Socio, Garantía…).",
  },
  {
    href: "/emisor",
    title: "Emisor",
    description: "Define ISSUER, verifica documentos y tokeniza productos, servicios y bienes.",
  },
  {
    href: "/catalogo",
    title: "Token",
    description: "Explora el Metaplace, compra y vende activos tokenizados con BRLT.",
  },
] as const;

export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <header>
        <p style={{ color: "#7aa2ff", fontWeight: 600, letterSpacing: 1 }}>BARLO METAPLACE</p>
        <h1 style={{ fontSize: 40, margin: "8px 0" }}>Activos reales, identidad verificada</h1>
        <p style={{ color: "#a9b4cc", maxWidth: 640 }}>
          El Metaplace reúne las tres suites de la plataforma: gestiona tu identidad, certifica tus
          activos y opera en el mercado con BRLT (token de utilidad, sin valor real en esta versión).
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <Link
            href="/login"
            style={{ background: "#3b6cff", color: "white", padding: "10px 18px", borderRadius: 8 }}
          >
            Conectar wallet
          </Link>
          <Link
            href="/catalogo"
            style={{ border: "1px solid #33406b", padding: "10px 18px", borderRadius: 8 }}
          >
            Ver catálogo
          </Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginTop: 40 }}>
        {SUITES.map((suite) => (
          <Link
            key={suite.href}
            href={suite.href}
            style={{
              display: "block",
              border: "1px solid #202a4d",
              borderRadius: 12,
              padding: 20,
              background: "#121936",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{suite.title}</h2>
            <p style={{ margin: 0, color: "#a9b4cc", fontSize: 14 }}>{suite.description}</p>
          </Link>
        ))}
      </section>

      <footer style={{ marginTop: 48, color: "#66739a", fontSize: 12 }}>
        Fase 3 · C1 esqueleto · BRLT sin valor real · <Link href="/api/health">salud del servicio</Link>
      </footer>
    </main>
  );
}
