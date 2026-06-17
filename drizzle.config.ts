import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit is a CLI outside Next, so it doesn't auto-load .env.local.
// override:false (default) → an inline DATABASE_URL=... wins (used to target phase branches).
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
