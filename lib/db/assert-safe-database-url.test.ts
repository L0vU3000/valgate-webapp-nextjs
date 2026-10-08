import { describe, it, expect, afterEach } from "vitest";
import { assertSafeDatabaseUrl } from "./assert-safe-database-url";

// The bug this guards, which actually happened: the production Neon branch is hosted at
// `ep-wild-violet-aot0pvt7`, which contains none of "prod"/"production"/"staging". A boundary
// backfill run against it passed the old guard and moved 41 live pins.
//
// The fix must block production WITHOUT blocking the ordinary dev branch — which is also a hosted
// Neon branch (`ep-tiny-rice-…`), so "anything remote" is the wrong rule and breaks the dev flow.

const DEV = "postgresql://u:p@ep-tiny-rice-aozn7g4j-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require";
const PROD = "postgresql://u:p@ep-wild-violet-aot0pvt7-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require";

afterEach(() => {
  delete process.env.ALLOW_DESTRUCTIVE_DB;
});

describe("assertSafeDatabaseUrl", () => {
  it("allows the dev branch, which is hosted", () => {
    expect(() => assertSafeDatabaseUrl(DEV, "backfill")).not.toThrow();
  });

  it("refuses the production branch even though the host name says nothing", () => {
    expect(() => assertSafeDatabaseUrl(PROD, "backfill")).toThrow(/wild-violet/);
  });

  it("still refuses an obviously-named production URL", () => {
    expect(() => assertSafeDatabaseUrl("postgres://u:p@db.example.com/prod", "backfill")).toThrow();
    expect(() => assertSafeDatabaseUrl("postgres://u:p@db.staging.example.com/x", "backfill")).toThrow();
  });

  it("allows anything when the operator opts in", () => {
    process.env.ALLOW_DESTRUCTIVE_DB = "1";
    expect(() => assertSafeDatabaseUrl(PROD, "backfill")).not.toThrow();
  });
});
