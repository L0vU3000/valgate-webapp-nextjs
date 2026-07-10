import type { NextRequest } from "next/server";
import { requireCtx } from "@/lib/auth/ctx";
import { scanDocument } from "@/lib/services/document-scan";
import { ALLOWED_MIME, MAX_BYTES } from "@/lib/upload-constants";
import { log } from "@/lib/log";

export const runtime = "nodejs"; // AI SDK + file bytes need the Node runtime (not Edge)
export const maxDuration = 60;   // give the model time to read the whole document

// POST /api/add-property/scan
//
// Reads a single scanned property document (photo or PDF/image the user just picked) and returns its
// details as a structured object for the add-property wizard to pre-fill. The whole job runs in this
// one request: authorize → validate the file → one model call → return the extracted fields.
//
// Authorization: requireCtx() requires an authenticated caller. Only the caller's own uploaded file is
// sent to the model; nothing is written here, so there is no resource to own-check.
//
// Errors: the model call can fail or time out — the try/catch logs the real error server-side and
// returns a generic message so the client can fall back to manual entry.
export async function POST(req: NextRequest) {
  await requireCtx();
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
    return Response.json({ ok: true, extracted, lowConfidence });
  } catch (err) {
    log.error("add-property.scan.failed", err);
    return Response.json(
      { ok: false, error: "Could not read that document. Please try again or enter the details manually." },
      { status: 500 },
    );
  }
}
