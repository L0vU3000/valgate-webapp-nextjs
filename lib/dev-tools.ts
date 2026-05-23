// Controls whether DEV shortcut buttons are visible.
// Always true in local dev. Set NEXT_PUBLIC_ENABLE_DEV_TOOLS=true in
// Vercel → Settings → Environment Variables (Preview scope) to keep
// them visible in deployed preview builds without affecting production.
export const isDevToolsEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";

// Minimal syntactically-valid PDF (~190 bytes). Passes all file validators
// and is accepted by the uploadDocument server action.
export function createDummyPdf(fileName = "dummy-document.pdf"): File {
  const content =
    "%PDF-1.0\n" +
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n" +
    "xref\n0 4\n" +
    "0000000000 65535 f\n" +
    "0000000009 00000 n\n" +
    "0000000058 00000 n\n" +
    "0000000115 00000 n\n" +
    "trailer<</Size 4/Root 1 0 R>>\n" +
    "startxref\n190\n%%EOF";
  const blob = new Blob([content], { type: "application/pdf" });
  return new File([blob], fileName, { type: "application/pdf" });
}

// 1×1 white JPEG (smallest valid JPEG). Used for photo upload inputs
// that expect image/* files.
export function createDummyImage(fileName = "dummy-photo.jpg"): File {
  const base64 =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS" +
    "Ew8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJ" +
    "CQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy" +
    "MjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf" +
    "/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAA" +
    "AAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJQAA//Z";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "image/jpeg" });
  return new File([blob], fileName, { type: "image/jpeg" });
}
