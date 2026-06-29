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
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["mapbox-gl"],
  outputFileTracingIncludes: {
    "/**/*": ["./public/data/**/*"],
  },
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: "/manager/:path*",
        destination: "/pro/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
