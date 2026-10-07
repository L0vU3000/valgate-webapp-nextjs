import "server-only";
import { resolveRouteCtx } from "@/lib/auth/ctx";
import { listProperties } from "@/lib/services/properties";
import { previewBoundary, matchBoundaries } from "@/lib/services/property-boundary";
import { parseKmz, KmzError } from "@/lib/services/kmz";
import { actionLimiter, allowed } from "@/lib/ratelimit";
import { log } from "@/lib/log";

export const runtime = "nodejs"; // node:zlib inflate needs the Node runtime, not Edge

// A drop is a folder of parcels, not a bulk data feed. Each file is inflated and polygon-walked
// in-request, so an unbounded drop is an unbounded amount of work in one call.
const MAX_FILES = 500;

// POST /api/property-boundary/preview
//
// Reads dropped KMZ files and reports what attaching each one WOULD do — parsed size, centre, the
// pin shift — plus which property each filename resolves to. Writes NOTHING: the confirmations
// (pin move, area mismatch) have to be shown before the user commits, so this is the read half of
// the upload and /commit is the write half.
//
// Authorization: requires an authenticated caller (JSON 401). Every property it reports on is
// looked up org-scoped, so a cross-org id can never be resolved or previewed.
export async function POST(req: Request) {
  const authResult = await resolveRouteCtx();
  if (!authResult.ok) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const ctx = authResult.ctx;
  if (!(await allowed(actionLimiter, ctx.userId, "boundaryPreview"))) {
    return Response.json({ ok: false, error: "Too many requests. Please try again in a moment." }, { status: 429 });
  }

  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return Response.json({ ok: false, error: "No files provided." }, { status: 400 });
    if (files.length > MAX_FILES) return Response.json({ ok: false, error: "Too many files at once." }, { status: 400 });

    const properties = await listProperties(ctx);
    const matches = matchBoundaries(files.map((f) => f.name), properties);
    // Filename → the File the browser sent, so each preview can be tied back to its bytes.
    // ponytail: two same-named files in one drop collide (last wins) — acceptable, the row is
    // keyed by name in the UI anyway; key on the File's index if a user ever hits it.
    const byName = new Map(files.map((f) => [f.name, f]));

    const rows = [];
    for (const match of matches) {
      const file = byName.get(match.file);
      if (!file) continue;
      const base = { file: match.file, code: match.code, propertyId: match.propertyId, reason: match.reason };

      // Parse BEFORE reporting a match failure. These are two independent facts about a file, and
      // short-circuiting on "no matching property" hid a real one: a `.kmz` that is not a readable
      // archive at all was reported as a name-matching problem, sending the user to look for a
      // property that was never the issue. An unreadable file is broken whatever it is called.
      const isKmz = file.name.toLowerCase().endsWith(".kmz");
      if (!isKmz) {
        rows.push({ ...base, status: "unmatched" as const, error: "Not a KMZ file" });
        continue;
      }
      // With no property to preview against, still prove the archive reads; report only what we
      // learned without also claiming a match succeeded.
      if (!match.propertyId) {
        try {
          parseKmz(Buffer.from(await file.arrayBuffer()));
          rows.push({ ...base, status: "unmatched" as const, error: "No matching property" });
        } catch (err) {
          rows.push({
            ...base,
            status: "error" as const,
            error: err instanceof KmzError ? err.message : "That file could not be read.",
          });
        }
        continue;
      }
      const preview = await previewBoundary(ctx, match.propertyId, Buffer.from(await file.arrayBuffer()));
      if (!preview.ok) {
        rows.push({ ...base, status: "error" as const, error: preview.error });
        continue;
      }
      const p = preview.preview;
      const property = properties.find((x) => x.id === match.propertyId);
      const declared = Number((property?.totalArea ?? "").replace(/,/g, "")) || 0;
      rows.push({
        ...base,
        status: "ready" as const,
        propertyName: property?.name ?? "",
        declaredM2: declared,
        sizeM2: p.sizeM2,
        // Positive = the ring measures larger than the officially-declared area. Shown as-is;
        // which number is "right" is unresolved (see the location page), so we never pick one.
        areaDiffPct: declared > 0 ? Math.round(((p.sizeM2 - declared) / declared) * 1000) / 10 : null,
        centroid: p.centroid,
        pinShiftM: p.pinShiftM,
        pinMoved: p.pinMoved,
        pinInside: p.pinInside,
        replaced: p.replaced,
        geometry: p.geometry,
      });
    }

    return Response.json({ ok: true, rows });
  } catch (err) {
    // Never echo err.message: it can carry a path or a driver detail. Log, return generic.
    log.error("property-boundary.preview.failed", err);
    return Response.json({ ok: false, error: "Could not read those files. Please try again." }, { status: 500 });
  }
}
