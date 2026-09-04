import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Our compressed photos target 2 MB; raise the action body limit to cover that
      // plus FormData envelope overhead. Documents are pre-validated to ≤10 MB client-side
      // but go through a separate presigned-POST path, so only photos hit this limit.
      bodySizeLimit: "4mb",
    },
    // Tree-shake barrel packages so a route only bundles the icons/exports it actually uses,
    // instead of pulling a whole library in through one named import. lucide-react (icons) and
    // motion (animation) are the two big barrels we import from across many components.
    optimizePackageImports: ["lucide-react", "motion"],
  },
  // Allow loading dev assets when opened via LAN IP or mDNS on a phone/tablet.
  allowedDevOrigins: [
    "192.168.0.123",
    "mintrose.local",
    "*.trycloudflare.com",
    "*.loca.lt",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["mapbox-gl"],
  outputFileTracingIncludes: {
    "/**/*": ["./public/data/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob: https://*.mapbox.com https://*.amazonaws.com; " +
              "connect-src 'self' https://*.mapbox.com https://*.clerk.accounts.dev https://api.resend.io; " +
              "font-src 'self'; " +
              "frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
