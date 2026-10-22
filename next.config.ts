import type { NextConfig } from "next";
import { authBackendOrigin } from "./src/lib/auth/backend-origin";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/verify-email", headers: [
      { key: "Cache-Control", value: "no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ] }];
  },
  // Frontend transport proxy only; Moyamoy owns the Better Auth handler.
  async rewrites() {
    const backend = authBackendOrigin();
    return ["auth", "v1"].map(namespace => ({ source: `/api/${namespace}/:path*`, destination: `${backend}/api/${namespace}/:path*` }));
  },
  experimental: { serverComponentsHmrCache: false },
};

export default nextConfig;
