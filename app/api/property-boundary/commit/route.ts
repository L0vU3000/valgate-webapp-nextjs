import "server-only";
import { resolveRouteCtx } from "@/lib/auth/ctx";
import { KmzError } from "@/lib/services/kmz";
import { attachBoundaryFromBytes } from "@/lib/services/property-boundary";
import { actionLimiter, allowed } from "@/lib/ratelimit";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import { log } from "@/lib/log";

export const runtime = "nodejs";

type Instruction = { propertyId: string; file: string; movePin?: boolean };

// POST /api/property-boundary/commit
//
// The write half of the upload. The browser re-sends the same files it previewed (they are still
// File objects in the page) alongside the per-file decision the user confirmed, so there is no
// server-side staging store and no upload token to expire. Re-parsing is cheap — a KMZ is a few
// kilobytes and inflate is instant.
//
// Instructions are a JSON string field (multipart can't nest objects); each one names a property
// the caller has decided on. attachBoundary re-checks org ownership per property, so a hand-edited
// instruction cannot write into another org.
export async function POST(req: Request) {
  const authResult = await resolveRouteCtx();
  if (!authResult.ok) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const ctx = authResult.ctx;
  if (!(await allowed(actionLimiter, ctx.userId, "boundaryCommit"))) {
    return Response.json({ ok: false, error: "Too many requests. Please try again in a moment." }, { status: 429 });
  }

  try {
    const form = await req.formData();
    const raw = form.get("instructions");
    let instructions: Instruction[];
    try {
      instructions = JSON.parse(typeof raw === "string" ? raw : "[]");
    } catch {
      return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }
    if (!Array.isArray(instructions) || !instructions.length) {
      return Response.json({ ok: false, error: "Nothing to attach." }, { status: 400 });
    }
    if (instructions.length > 500) {
      return Response.json({ ok: false, error: "Too many files at once." }, { status: 400 });
    }

    const files = new Map(
      form.getAll("files").filter((f): f is File => f instanceof File).map((f) => [f.name, f]),
    );

    // Per-file outcomes, so one bad file never discards the rest of a batch.
    const results = [];
    for (const item of instructions) {
      const file = files.get(item.file);
      if (!file || !item.propertyId) {
        results.push({ file: item.file, ok: false, error: "File missing from the request." });
        continue;
      }
      try {
        const bytes = Buffer.from(await file.arrayBuffer());
        // Same function the backfill script uses, so the pin rule and the replace rule cannot
        // drift between the two entry points.
        const attached = await attachBoundaryFromBytes(ctx, item.propertyId, bytes, item.file, {
          storeFiles: true,
          movePin: item.movePin !== false,
        });
        results.push({ file: item.file, propertyId: item.propertyId, ok: true, ...attached });
      } catch (err) {
        // Expected user-facing failures (bad KMZ, missing property) keep their message;
        // anything unexpected is logged and reported generically.
        const known = err instanceof KmzError || (err instanceof Error && err.message === "Property not found");
        if (!known) log.error("property-boundary.commit.failed", err);
        results.push({
          file: item.file,
          propertyId: item.propertyId,
          ok: false,
          error: known ? (err as Error).message : "Could not attach that boundary.",
        });
      }
    }

    // Boundaries feed the location page, which reads through both caches.
    revalidateFeTag("properties");
    await bustCache("properties");

    return Response.json({ ok: true, results });
  } catch (err) {
    log.error("property-boundary.commit.failed", err);
    return Response.json({ ok: false, error: "Could not attach those boundaries." }, { status: 500 });
  }
}
