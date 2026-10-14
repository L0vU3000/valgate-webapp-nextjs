// Shared upload constraints used by both the client (Step4PhotosDocs) and the
// server (storage.ts, uploadDraftFileAction). Keeping them in one place prevents
// the client and server from drifting out of sync.

export const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Ceiling for a file that travels THROUGH a Server Action. The request body is capped by
// experimental.serverActions.bodySizeLimit in next.config.ts (4 MB — itself under the ~4.5 MB
// serverless request-body limit), and that cap is enforced by the framework BEFORE the action
// runs, so a bigger file fails with an opaque error and never reaches uploadDocument. Files on a
// direct-to-S3 path (the iOS presign route, KMZ) are not bound by it and may use MAX_BYTES.
export const MAX_ACTION_BYTES = 4 * 1024 * 1024; // 4 MB

export const ALLOWED_MIME = new Set([
  // photos
  "image/jpeg", "image/png", "image/webp",
  // documents
  "application/pdf",
  "application/msword",                                                        // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",   // .docx
  "application/vnd.ms-excel",                                                  // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",         // .xlsx
]);

export const ALLOWED_DOC_EXT = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx"]);

// KMZ (a zipped KML). Browsers often report an empty type for it, so it is matched by
// EXTENSION — see isKmz. Kept out of ALLOWED_MIME so the document/photo pickers stay unchanged;
// only the boundary upload accepts it, and it goes up on a SEPARATE presign path.
export const KMZ_MIME = "application/vnd.google-earth.kmz";
export const KMZ_MAX_BYTES = 5 * 1024 * 1024; // real KMZ files are a few KB; generous ceiling

export function isKmz(file: File): boolean {
  if (file.type.toLowerCase() === KMZ_MIME) return true;
  return file.name.toLowerCase().endsWith(".kmz");
}

// iOS sometimes reports HEIC files with an empty MIME type, so we check both
// the MIME type and the file extension to be safe.
export function isHeic(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime === "image/heic" || mime === "image/heif") return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "heic" || ext === "heif";
}
