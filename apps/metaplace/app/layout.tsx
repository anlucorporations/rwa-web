import type { Metadata } from "next";
import type { ReactNode } from "react";

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
