import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // This is needed due to ethers.js type incompatibility with strict TypeScript
    ignoreBuildErrors: true,
  },
  
  output: "standalone",
};

export default nextConfig;
