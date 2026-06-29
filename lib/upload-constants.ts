// Shared upload constraints used by both the client (Step4PhotosDocs) and the
// server (storage.ts, uploadDraftFileAction). Keeping them in one place prevents
// the client and server from drifting out of sync.

export const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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

// iOS sometimes reports HEIC files with an empty MIME type, so we check both
// the MIME type and the file extension to be safe.
export function isHeic(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime === "image/heic" || mime === "image/heif") return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "heic" || ext === "heif";
}
