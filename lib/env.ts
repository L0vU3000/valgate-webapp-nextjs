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
    // Shared secret for Vercel Cron routes. Vercel sends it as `Authorization: Bearer ${CRON_SECRET}`;
    // the cron route 401s unless it matches. Optional so local builds don't fail when unset — the route
    // refuses to run (401) without it, so an unset secret means "locked", never "open". Set in Vercel.
    CRON_SECRET: z.string().min(1).optional(),
    // OpenAI key for the document AI summaries (Phase 2). The @ai-sdk/openai provider reads
    // process.env.OPENAI_API_KEY automatically; we validate it here so a misconfig is caught at
    // boot. Optional so local builds without AI still start — the summarize route just lands in
    // its "failed" state if the key is missing. Never expose this to the client (no NEXT_PUBLIC_).
    OPENAI_API_KEY: z.string().min(1).optional(),
    // Resend — client invitation emails + bounce webhooks (Phase 3 onboarding).
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().min(1).optional(),
    // MCP audience binding (Phase 3, M1). Clerk OAuth tokens are bound to the Clerk *instance*,
    // not to this specific /mcp resource — so by default ANY OAuth client registered in our Clerk
    // instance could call /mcp. This is a comma-separated allowlist of OAuth client ids we accept
    // (e.g. the manually-registered ChatGPT app's client id). When SET, /mcp rejects tokens from
    // any other client with 401. When UNSET, /mcp accepts any valid client in the instance — which
    // is what Dynamic Client Registration (DCR) needs, since DCR mints a fresh client id per client
    // that we can't know in advance. Server-only; never prefix with NEXT_PUBLIC_.
    MCP_ALLOWED_OAUTH_CLIENT_IDS: z.string().min(1).optional(),
    // MCP open-client opt-in (Phase 3, M1). When MCP_ALLOWED_OAUTH_CLIENT_IDS is UNSET, /mcp would
    // otherwise accept ANY OAuth client in the Clerk instance. In PRODUCTION we fail closed instead
    // (reject all) — UNLESS this is explicitly true, the conscious "run open for DCR" switch (DCR
    // client ids can't be allowlisted ahead of time). Dev/test stay permissive so local testing is
    // never blocked. Mirrors CRON_SECRET's "unset means locked, never open" stance. Server-only.
    MCP_ALLOW_ANY_OAUTH_CLIENT: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
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
    CRON_SECRET: process.env.CRON_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    MCP_ALLOWED_OAUTH_CLIENT_IDS: process.env.MCP_ALLOWED_OAUTH_CLIENT_IDS,
    MCP_ALLOW_ANY_OAUTH_CLIENT: process.env.MCP_ALLOW_ANY_OAUTH_CLIENT,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },
  emptyStringAsUndefined: true,
});
