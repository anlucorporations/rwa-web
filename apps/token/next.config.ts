import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  output: "standalone",

  transpilePackages: ["@rwa/shared", "@rwa/ui"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;
