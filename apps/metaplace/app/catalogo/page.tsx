export const metadata = { title: "Catálogo · Barlo Metaplace" };

/**
 * Placeholder de C1: el catálogo real (CU-01) se implementa en C3 sobre
 * `GET /api/catalog` y la tabla `listings`.
 */
export default function CatalogoPage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Catálogo</h1>
      <p style={{ color: "#a9b4cc" }}>
        Aún no hay activos publicados. Cuando el emisor tokenice y publique activos, aparecerán aquí
        con su precio en BRLT.
      </p>
    </main>
  );
}
