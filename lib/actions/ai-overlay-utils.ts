import { parseClientIdFromPath } from "@/lib/data/derivations/ai-context";

// Maps a pathname to a "surface" so we don't bleed sessions across surfaces.
// /pro/clients/<id> → client:<id>   (a specific owner-client workspace)
// other /pro/* → pro                (manager cockpit, book-wide)
// everything else → consumer        (portfolio, property pages)
export function surfaceKey(pathname: string): string {
  const clientId = parseClientIdFromPath(pathname);
  if (clientId) return `client:${clientId}`;
  // Match /pro exactly or /pro/ prefix — avoid matching /property
  if (pathname === "/pro" || pathname.startsWith("/pro/")) return "pro";
  return "consumer";
}

// Best-effort: a tool step succeeded if the SDK returned a result and no error part.
export function isToolStepSuccessful(
  toolCallId: string,
  toolResults: Array<{ toolCallId: string }>,
  content: Array<{ type: string; toolCallId?: string }>,
): boolean {
  const errored = content.some(
    (part) => part.type === "tool-error" && part.toolCallId === toolCallId,
  );
  if (errored) return false;
  return toolResults.some((result) => result.toolCallId === toolCallId);
}
