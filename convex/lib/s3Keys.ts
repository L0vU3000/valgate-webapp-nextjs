export type DocKeyMode = "temporary" | "permanent";

export interface BuildDocKeyInput {
  mode: DocKeyMode;
  orgId: string;
  propertyId: string;
  docId: string;
  rid: string;
  safeName: string;
}

export function buildDocKey(input: BuildDocKeyInput): string {
  const safe =
    encodeURIComponent(input.safeName)
      // keep filename readable while safe for S3 keys
      .replace(/%20/g, "+");
  return `org/${input.orgId}/property/${input.propertyId}/docs/${input.mode}/${input.docId}/${input.rid}-${safe}`;
}

export function isKeyInOrg(orgId: string, key: string): boolean {
  return key.startsWith(`org/${orgId}/`);
}

export function isDocKeyFor(
  params: { orgId: string; propertyId: string; docId: string; mode?: DocKeyMode },
  key: string,
): boolean {
  const modeSegment = params.mode ? `${params.mode}/` : "";
  const prefix = `org/${params.orgId}/property/${params.propertyId}/docs/${modeSegment}${params.docId}/`;
  return key.startsWith(prefix);
}


