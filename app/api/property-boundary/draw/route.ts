import "server-only";
import { z } from "zod";
import { resolveRouteCtx } from "@/lib/auth/ctx";
import { attachDrawnBoundary } from "@/lib/services/property-boundary";
import { actionLimiter, allowed } from "@/lib/ratelimit";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import { log } from "@/lib/log";

export const runtime = "nodejs";

// POST /api/property-boundary/draw
//
// The write half of the map draw tool. The browser sends the ring it collected as [lng, lat] pairs;
// this validates it and hands it to the same attach path the KMZ upload uses, so the pin rule, the
// replace rule and the IDOR check are shared rather than reimplemented.
//
// The ring arrives from the client, so it is hostile input: the cap below is what stops a 100k-point
// polygon from being stored, and `attachDrawnBoundary` drops degenerate rings. The org check is in
// `attachBoundary` (it resolves the property against ctx.orgId before writing).
const MAX_POINTS = 2000;

const BodySchema = z.object({
  propertyId: z.string().min(1).max(64),
  // [lng, lat], the order GeoJSON and KML both use. Bounded to real coordinates so a mistyped point
  // cannot put a parcel in the sea off Antarctica.
  ring: z
    .array(z.tuple([z.number().gte(-180).lte(180), z.number().gte(-90).lte(90)]))
    .min(3)
    .max(MAX_POINTS),
  movePin: z.boolean().optional(),
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
    const attached = await attachDrawnBoundary(ctx, body.propertyId, body.ring, {
      movePin: body.movePin,
    });
    revalidateFeTag("properties");
    await bustCache("properties");
    return Response.json({ ok: true, attached });
  } catch (err) {
    // Expected user-facing failures keep their message (they are written for the user);
    // anything unexpected is logged and reported generically.
    const known =
      err instanceof Error &&
      (err.message === "Property not found" ||
        err.message.startsWith("A boundary needs") ||
        err.message.startsWith("The boundary crosses itself"));
    if (!known) log.error("property-boundary.draw.failed", err);
    return Response.json(
      { ok: false, error: known ? (err as Error).message : "Could not save that boundary." },
      { status: known ? 400 : 500 },
    );
  }
}
