import type { NextConfig } from "next";

const serverApiUrl = process.env.SERVER_API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@cloud-recommender/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${serverApiUrl}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${serverApiUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
