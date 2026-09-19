import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@life/simulation-core"],
  reactStrictMode: true,
};

export default nextConfig;
