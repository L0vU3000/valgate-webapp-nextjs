import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// The single typed env boundary (backend C1) merged with the frontend's two vars.
// NOTE: intentionally NO `import "server-only"` here — the backend's env.ts had it, but the
// frontend's map components (client) read env.NEXT_PUBLIC_MAPBOX_TOKEN. t3-env enforces the
// server/client split itself (server vars throw if read in the browser), so dropping server-only
// is safe and required.
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().min(1).optional(),
    CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
    // string→boolean. z.coerce.boolean() is WRONG here: Boolean("false") === true, so DEMO_MODE=false
    // would parse to true. Parse the literal string instead; empty/unset → undefined → default false.
    DEMO_MODE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    // Local-dev escape hatch: allow writes while in DEMO_MODE (against your own dev DB). Default off
    // keeps any hosted/shared demo read-only. DEMO_MODE is already refused in production (ctx.ts),
    // so this only ever takes effect locally.
    DEMO_ALLOW_WRITES: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    STORAGE_BUCKET: z.string().min(1).optional(),
    STORAGE_REGION: z.string().min(1).optional(),
    STORAGE_ACCESS_KEY_ID: z.string().min(1).optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    // B9 rate-limit (Upstash). Optional: unset ⇒ lib/ratelimit falls back to an in-memory limiter (dev/test).
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    // B9 RLS (Neon authenticated role). Optional until Neon RLS + Clerk JWT are provisioned (D17).
    DATABASE_AUTHENTICATED_URL: z.string().url().optional(),
    // FE: site-gate password (also read directly via process.env in lib/site-gate.ts).
    SITE_PASSWORD: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
    // FE: Mapbox token — required; the map components depend on it (preserves the old env.ts guarantee).
    NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SIGNING_SECRET: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    DEMO_MODE: process.env.DEMO_MODE,
    DEMO_ALLOW_WRITES: process.env.DEMO_ALLOW_WRITES,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    STORAGE_REGION: process.env.STORAGE_REGION,
    STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID,
    STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    DATABASE_AUTHENTICATED_URL: process.env.DATABASE_AUTHENTICATED_URL,
    SITE_PASSWORD: process.env.SITE_PASSWORD,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },
  emptyStringAsUndefined: true,
});
