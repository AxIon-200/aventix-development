import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Frontend transport proxy only; Moyamoy owns the Better Auth handler.
  async rewrites() {
    const backend = new URL(process.env.AUTH_BACKEND_URL ?? "http://localhost:5000");
    if (!["http:", "https:"].includes(backend.protocol) || backend.username || backend.password || backend.pathname !== "/" || backend.search || backend.hash) {
      throw new Error("AUTH_BACKEND_URL must be an HTTP(S) origin without credentials or a path.");
    }
    return [{ source: "/api/auth/:path*", destination: `${backend.origin}/api/auth/:path*` }];
  },
};

export default nextConfig;
