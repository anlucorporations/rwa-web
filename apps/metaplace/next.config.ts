import type { NextConfig } from "next";

/** Cabeceras de seguridad base del Metaplace (RNF-V3-01); endurecimiento final en C5. */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },

];

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@rwa/shared", "@rwa/ui", "@rwa/wallet-messages"],
  serverExternalPackages: ["pg"],
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
