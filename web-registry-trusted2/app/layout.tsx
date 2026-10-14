import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RegistryChain - Trusted Issuers On Chain",
  description: "Decentralized registry system for managing trusted issuers and claim topics with blockchain security.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
