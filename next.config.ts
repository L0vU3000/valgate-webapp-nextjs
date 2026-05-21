import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
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
  // mapbox-gl uses browser-only APIs (DOMMatrix, Worker, etc.) and must
  // never be bundled for the server — mark it external so Node never evaluates it.
  serverExternalPackages: ["mapbox-gl"],
  // Vercel serverless functions don't bundle public/ files by default, but our
  // local-db layer (lib/data/db/_fs.ts) reads JSON fixtures from public/data
  // via fs.readFile. Force the tracer to include those files in every route's bundle.
  outputFileTracingIncludes: {
    "/**/*": ["./public/data/**/*"],
  },
};

export default nextConfig;
