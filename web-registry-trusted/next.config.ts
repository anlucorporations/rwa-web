import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  output: "standalone",
  
  transpilePackages: ["@rwa/shared"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;
