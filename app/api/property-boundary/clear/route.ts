import "server-only";
import { z } from "zod";
import { resolveRouteCtx } from "@/lib/auth/ctx";
import { clearBoundary } from "@/lib/services/property-boundary";
import { actionLimiter, allowed } from "@/lib/ratelimit";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import { log } from "@/lib/log";

export const runtime = "nodejs";

// POST /api/property-boundary/clear
//
// Remove a property's land boundary. The org check and the IDOR check live in `listLandParcels` /
// `deleteLandParcel` (both scoped to ctx.orgId), so a property id from another org finds nothing and
// deletes nothing rather than erroring differently — same posture as the draw route.
const BodySchema = z.object({
  propertyId: z.string().min(1).max(64),
});

export async function POST(req: Request) {
  const authResult = await resolveRouteCtx();
  if (!authResult.ok) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const ctx = authResult.ctx;
  if (!(await allowed(actionLimiter, ctx.userId, "boundaryCommit"))) {
    return Response.json({ ok: false, error: "Too many requests. Please try again in a moment." }, { status: 429 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    const cleared = await clearBoundary(ctx, body.propertyId);
    revalidateFeTag("properties");
    await bustCache("properties");
    return Response.json({ ok: true, cleared });
  } catch (err) {
    log.error("property-boundary.clear.failed", err);
    return Response.json({ ok: false, error: "Could not clear that boundary." }, { status: 500 });
  }
}
