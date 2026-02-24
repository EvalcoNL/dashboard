import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
