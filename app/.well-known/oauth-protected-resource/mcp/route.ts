// Phase 3 — OAuth 2.0 Protected Resource Metadata (RFC 9728) for the MCP server at /mcp.
//
// This public, unauthenticated document tells an MCP client which Clerk authorization server to
// use to obtain a token. `withMcpAuth` (in app/mcp/route.ts) points 401 responses here via its
// `resourceMetadataPath`, so the path below must match: /.well-known/oauth-protected-resource/mcp.
//
// protectedResourceHandlerClerk derives the Clerk auth server URL from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
// The OPTIONS handler answers CORS preflight for browser-based MCP clients.
import {
  protectedResourceHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from "@clerk/mcp-tools/next";

export const dynamic = "force-dynamic";

const clerkHandler = protectedResourceHandlerClerk();

// IMPORTANT (reverse-proxy / tunnel fix): protectedResourceHandlerClerk builds the metadata's
// `resource` field from `new URL(req.url).origin`. Behind a proxy (cloudflared tunnel, a load
// balancer, etc.) that origin is the INTERNAL bind address (e.g. https://0.0.0.0:3001), not the
// public URL the MCP client actually reached us on. A `resource` that doesn't match the URL the
// client connected to breaks the OAuth flow — the client rejects our metadata and falls back to
// probing the wrong authorization server. So we rebuild the request URL from the forwarded host/
// proto (falling back to the raw URL when there's no proxy) and hand the library a corrected
// request. mcp-handler already resolves the public origin this way for the 401 pointer, so this
// keeps the two in agreement.
function publicOrigin(req: Request): { protocol: string; hostname: string } | null {
  const rawHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!rawHost) return null;
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  // Take the first value if the header is a comma-separated proxy chain, and STRIP any port.
  // Behind a TLS-terminating proxy/tunnel the public port is implicit (443), but the forwarded
  // host can still carry the internal port (e.g. ":3001") — leaving it makes the `resource`
  // origin differ from the URL the client actually reached, which breaks the OAuth match.
  const hostname = rawHost.split(",")[0].trim().replace(/:\d+$/, "");
  return { protocol: `${proto}:`, hostname };
}

function GET(req: Request): Response {
  const pub = publicOrigin(req);
  if (!pub) return clerkHandler(req);
  const url = new URL(req.url);
  url.protocol = pub.protocol;
  url.hostname = pub.hostname;
  url.port = ""; // public HTTPS — no explicit port
  // Re-issue the request with the public URL so the library computes the correct `resource`.
  return clerkHandler(new Request(url.toString(), req));
}

export { GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
