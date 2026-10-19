import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
 
  output: "standalone",

  // Paquete compartido del monorepo (TS fuente) y driver de PostgreSQL solo en servidor.
  transpilePackages: ["@rwa/shared", "@rwa/ui"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;
