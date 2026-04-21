import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { requireActiveMember, requireBackofficeAuth } from "./security";

const http = httpRouter();



http.route({
  path: "/secure/image",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const { searchParams } = new URL(request.url);
      const orgId = searchParams.get("orgId") || "";
      const userId = searchParams.get("userId") || "";
      const imageIdParam = searchParams.get("imageId");
      if (!orgId || !userId || (!imageIdParam && !searchParams.get("storageId"))) return new Response("Bad Request", { status: 400 });

      await requireActiveMember(ctx, orgId, userId);

      // Resolve storage metadata using a query to enforce org membership
      const storageIdParam = searchParams.get("storageId");
      const resolved = await ctx.runQuery(api.myFunctions.secureGetImageStorage as any, {
        orgId,
        userId,
        imageId: imageIdParam ? (imageIdParam as any) : undefined,
        storageId: storageIdParam ? (storageIdParam as any) : undefined,
      } as any);
      const storageId = resolved?.storageId;
      if (!storageId) return new Response("Bad Request", { status: 400 });
      const blob = await ctx.storage.get(storageId as any);
      if (!blob) return new Response("Not Found", { status: 404 });
      const mime = resolved?.mimeType || "application/octet-stream";
      try {
        await (ctx as any).db.insert("activities", {
          orgId,
          type: "secure.image.read",
          userId,
          entityId: imageIdParam || storageId,
          entityType: "image",
          metadata: { route: "secure/image" },
          createdAt: new Date().toISOString(),
        });
      } catch {}
      return new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch (e) {
      try {
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get("orgId") || "";
        const userId = searchParams.get("userId") || "";
        await (ctx as any).db.insert("activities", {
          orgId,
          type: "secure.image.error",
          userId,
          entityType: "image",
          metadata: { route: "secure/image", error: (e as any)?.message },
          createdAt: new Date().toISOString(),
        });
      } catch {}
      return new Response("Internal Server Error", { status: 500 });
    }
  }),
});

// Helper function to extract extension from MIME type
const extFromMime = (mime: string) => {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "application/pdf") return "pdf";
  const slash = mime.indexOf("/");
  return slash > 0 ? mime.slice(slash + 1).replace(/[^a-z0-9]/gi, "") || "bin" : "bin";
};

http.route({
  path: "/scan/createCapture",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. Extract and decrypt JWT token
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const token = authHeader.slice("Bearer ".length);

      let payload: any;
      try {
        payload = await ctx.runAction((api as any).actions.scanAuth.decryptScanToken, {
          token,
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid token", reason: "invalid_token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const scanSessionId = payload.scanSessionId;
      const qrToken = payload.token;
      if (!scanSessionId || !qrToken) {
        return new Response(
          JSON.stringify({ error: "Missing scanSessionId or token in JWT payload", reason: "invalid_payload" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 2. Validate session via query
      const session = await ctx.runQuery(api.queries.scans.sessionByTokenPublic, {
        sessionId: scanSessionId as any,
        token: qrToken,
      });

      if (!session) {
        return new Response(JSON.stringify({ error: "Session not found", reason: "session_not_found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 3. Check session status
      if (session.status !== "active") {
        return new Response(
          JSON.stringify({ error: "Session is not active", reason: "inactive_status", status: session.status }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 4. Verify expiresAt is in the future
      const expiresAtMs = Date.parse(String(session.expiresAt));
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        return new Response(
          JSON.stringify({ error: "Session has expired", reason: "expired", expiresAt: String(session.expiresAt) }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 5. Check totalCaptures < maxCaptures
      const totalCaptures = Number(session.totalCaptures ?? 0);
      const maxCaptures = Number(session.maxCaptures ?? 0);
      if (maxCaptures > 0 && totalCaptures >= maxCaptures) {
        return new Response(
          JSON.stringify({ error: "Max captures limit reached", reason: "limit_reached" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 6. Parse request body
      let body: any;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { mimeType, sizeBytes, ocrStatus, ocrResult, errorReason } = body;

      if (!mimeType) {
        return new Response(JSON.stringify({ error: "Missing mimeType", reason: "validation" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 7. Generate objectKey server-side
      const captureIndex = totalCaptures; // Use current totalCaptures as the index
      const rid = await ctx.runAction((api as any).actions.scanAuth.generateUUID, {});
      const ext = extFromMime(mimeType);
      const objectKey = `org/${session.orgId}/scan/${scanSessionId}/captures/${captureIndex}-${rid}.${ext}`;

      // 8. Call internal mutation
      const result = await ctx.runMutation(internal.mutations.scans.deviceCreateCapture, {
        sessionId: scanSessionId as any,
        orgId: session.orgId,
        objectKey,
        mimeType,
        sizeBytes,
        ocrStatus,
        ocrResult,
        errorReason,
      });

      // 9. Return success response
      return new Response(
        JSON.stringify({
          captureId: result.captureId,
          objectKey,
          captureIndex: result.captureIndex,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 400 : 500;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;

// Secure document serving
http.route({
  path: "/secure/document",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const { searchParams } = new URL(request.url);
      const orgId = searchParams.get("orgId") || "";
      const userId = searchParams.get("userId") || "";
      const documentId = searchParams.get("documentId");
      if (!orgId || !userId || !documentId) return new Response("Bad Request", { status: 400 });

      await requireActiveMember(ctx, orgId, userId);

      const resolved = await ctx.runQuery(api.myFunctions.secureGetDocumentStorage as any, {
        orgId,
        userId,
        documentId: documentId as any,
      } as any);
      const storageId = resolved?.storageId;
      if (!storageId) return new Response("Forbidden", { status: 403 });
      const blob = await ctx.storage.get(storageId as any);
      if (!blob) return new Response("Not Found", { status: 404 });
      const mime = resolved?.mimeType || "application/octet-stream";
      try {
        await (ctx as any).db.insert("activities", {
          orgId,
          type: "secure.document.read",
          userId,
          entityId: documentId,
          entityType: "document",
          metadata: { route: "secure/document" },
          createdAt: new Date().toISOString(),
        });
      } catch {}
      return new Response(blob, { status: 200, headers: { "Content-Type": mime, "Cache-Control": "private, max-age=60" } });
    } catch (e) {
      try {
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get("orgId") || "";
        const userId = searchParams.get("userId") || "";
        const documentId = searchParams.get("documentId") || "";
        await (ctx as any).db.insert("activities", {
          orgId,
          type: "secure.document.error",
          userId,
          entityId: documentId,
          entityType: "document",
          metadata: { route: "secure/document", error: (e as any)?.message },
          createdAt: new Date().toISOString(),
        });
      } catch {}
      return new Response("Internal Server Error", { status: 500 });
    }
  }),
});



// Admin HTTP routes (secured via Clerk backoffice JWT)
http.route({
  path: "/admin/property-risk/set",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    try {
      await ctx.runMutation((internal as any).admin.mutations.setPropertyRisk as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/property-risk/bulk-mark-safe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.bulkMarkRiskSafe as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/property-risk/add",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.addPropertyRisk as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/property-risk/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.updatePropertyRisk as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/property-risk/remove",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.removePropertyRisk as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/property-risk/adjust",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.adjustPropertyRiskCounts as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/location/progress",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.setLocationProgress as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/location/progress/bulk-promote-none",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.bulkPromoteNoneToProgress as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/location/provided/point",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.setLocationProvidedPoint as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/location/provided/boundary",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.setLocationProvidedBoundary as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/location/provided/polygon",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await requireBackofficeAuth(request);
    } catch (e) {
      const status = e instanceof ConvexError ? 401 : 500;
      const msg = e instanceof ConvexError ? e.message : "Internal error";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.setLocationProvidedPolygon as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/admin/location/provided/feature",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authResult = await requireBackofficeAuth(request);
    if (authResult instanceof Response) return authResult;
    let payload: any;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
    try {
      await ctx.runMutation((internal as any).admin.mutations.setLocationProvidedFeature as any, payload as any);
      return new Response(null, { status: 204 });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Internal error";
      const status = /invalid|validation|args/i.test(msg) ? 422 : 500;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
    }
  }),
});
