import type { NextRequest } from "next/server";
import { resolveRouteCtx } from "@/lib/auth/ctx";
import { scanDocument } from "@/lib/services/document-scan";
import { geocodeAddress } from "@/lib/services/property-import";
import { ALLOWED_MIME, MAX_BYTES } from "@/lib/upload-constants";
import { docIngestLimiter, allowed } from "@/lib/ratelimit";
import { log } from "@/lib/log";

export const runtime = "nodejs"; // AI SDK + file bytes need the Node runtime (not Edge)
export const maxDuration = 60;   // give the model time to read the whole document

// POST /api/add-property/scan
//
// Reads a single scanned property document (photo or PDF/image the user just picked) and returns its
// details as a structured object for the add-property wizard to pre-fill. The whole job runs in this
// one request: authorize → validate the file → one model call → return the extracted fields.
//
// Authorization: resolveRouteCtx() requires an authenticated caller (JSON 401 if not). Only the
// caller's own uploaded file is sent to the model; nothing is written here, so there is no
// resource to own-check.
//
// Errors: the model call can fail or time out — the try/catch logs the real error server-side and
// returns a generic message so the client can fall back to manual entry.
export async function POST(req: NextRequest) {
  const authResult = await resolveRouteCtx();
  if (!authResult.ok) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const ctx = authResult.ctx;
  // TM1-64: the costliest paid-model edge in the app — one request runs several model
  // passes (self-consistency) with a 60s budget, so an authenticated loop here bills us
  // hardest. Gated before the body is even read, so a blocked caller costs us nothing.
  // Its own limiter, so the ingest budget is separate from summaries and spreadsheet mapping.
  if (!(await allowed(docIngestLimiter, ctx.userId))) {
    log.warn("ratelimit.block", { edge: "documentScan", userId: ctx.userId });
    return Response.json(
      { ok: false, error: "Too many requests. Please try again in a moment." },
      { status: 429 },
    );
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "No file provided." }, { status: 400 });
    }
    // Validate against the SAME allowlist + cap the draft staging enforces, so anything that scans
    // can also be attached to the property afterwards.
    if (!ALLOWED_MIME.has(file.type)) {
      return Response.json({ ok: false, error: "That file type isn't supported. Use a PDF or image." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ ok: false, error: "File is over the 10 MB limit." }, { status: 400 });
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    // Self-consistency scan: `extracted` is the reconciled result; `lowConfidence` names the fields the
    // runs disagreed on, so the wizard can flag them for the user to review.
    const { extracted, lowConfidence } = await scanDocument(fileBytes, file.type || "application/pdf");
    // A document names a place but never carries machine coordinates, so the address it gave us is
    // resolved HERE — the caller would otherwise have to rebuild the same string from the same
    // fields. `coords: null` means "we don't know where this is": the caller's cue to ask the user
    // for a pin rather than guess one. geocodeAddress never throws (it returns null).
    const address = [
      extracted.addressLine,
      extracted.addressLine2,
      extracted.city,
      extracted.province,
      extracted.zip,
      extracted.country,
    ]
      .filter(Boolean)
      .join(", ");
    const coords = address ? await geocodeAddress(address) : null;
    return Response.json({ ok: true, extracted, lowConfidence, coords, address: address || null });
  } catch (err) {
    log.error("add-property.scan.failed", err);
    return Response.json(
      { ok: false, error: "Could not read that document. Please try again or enter the details manually." },
      { status: 500 },
    );
  }
}
