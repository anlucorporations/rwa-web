import type { Metadata } from "next";
import type { ReactNode } from "react";

// CSP con nonce por petición (AM-09): las páginas deben renderizarse en servidor
// para que Next aplique el nonce a sus scripts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Barlo Metaplace",
  description:
    "Metaplace de activos reales tokenizados: identidad certificada, emisión y mercado con BRLT.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0b1020",
          color: "#e8ecf7",
        }}
      >
        {children}
      </body>
    </html>
  );
}
