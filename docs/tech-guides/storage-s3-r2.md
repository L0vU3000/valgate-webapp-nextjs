# Object storage (S3 / R2) — Valgate guide

> Role: where document & photo **blobs** live — uploaded direct-to-bucket via presigned POST, never through our server.
> Version pinned: `@aws-sdk/client-s3` + `@aws-sdk/s3-presigned-post` ^3 · Last verified: 2026-06-11 against AWS SDK v3 docs.
> Decisions: provider (S3 vs R2) decided **at B7**; SDK deps already in `package.json`, so S3-compatible either way.
> Build phases: B7 (document storage — presigned uploads, URL-resolver, validation).
> Official docs: [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/) · [`s3-presigned-post`](https://www.npmjs.com/package/@aws-sdk/s3-presigned-post) · [R2 S3 API](https://developers.cloudflare.com/r2/api/s3/api/)

---

## §0 — Cheat-sheet

```ts
// server side: mint a presigned POST the browser uploads straight to (server-only — C1)
import { presignUpload } from "@/lib/services/storage";
const { url, fields, storageId } = await presignUpload(ctx, {
  name: "title-deed.pdf", mimeType: "application/pdf", sizeBytes: 842_000,
});
// → client POSTs multipart/form-data to `url` with `fields` + the file. storageId is the object key.

// resolve ANY documents.storage_id to a URL the browser can load (legacy path OR object key)
import { resolveDocumentUrl } from "@/lib/services/storage";
const href = await resolveDocumentUrl(doc.storageId);   // "public/seed/x.pdf" OR "org_x/DOC-0007/title.pdf"
```

The five facts that matter most: **(1)** the client uploads **direct to the bucket** — bytes never touch our server (§4). **(2)** `documents.storage_id` **is the object key** (§4). **(3)** the **presigned conditions are the real enforcement** of size & MIME, not the client (§5). **(4)** `resolveDocumentUrl` handles **both** legacy `public/...` seed paths **and** object keys (§4). **(5)** bucket credentials are **server-only** — never sent to the client ([C1](./_conventions.md#c1)). R2 is S3-compatible: same SDK, one config line differs (§2).

## §1 — Why it's in our stack

Documents (title deeds, lease PDFs, inspection photos) are blobs — they do not belong in Postgres rows, and routing megabytes through a Next.js server action is slow and burns serverless time/memory. So uploads go **direct to an S3-compatible bucket** via a presigned POST our server signs; the DB only ever stores the **object key** in `documents.storage_id`. We deferred the **S3-vs-R2** choice to B7 because the AWS SDK v3 deps are already in `package.json` and both speak the same S3 API — picking R2 (cheaper egress) vs S3 is one endpoint/credentials change (§2), not a rewrite. We rejected base64-in-DB (bloats rows, breaks Drizzle types) and server-proxied multipart (latency + memory).

## §2 — Setup in our stack

```bash
# already declared in package.json — present from B7
npm i @aws-sdk/client-s3 @aws-sdk/s3-presigned-post
```

All bucket config is validated through `@t3-oss/env-nextjs` — see [`env-nextjs.md`](./env-nextjs.md); never read `process.env` directly. The vars: `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, and (R2 only) `STORAGE_ENDPOINT` + `STORAGE_PUBLIC_BASE_URL`.

**`lib/services/storage.ts`** — the one S3 client + the resolver/presign helpers (server-only):

```ts
import "server-only";                                    // C1 — bucket creds never reach the browser
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

export const s3 = new S3Client({
  region: env.STORAGE_REGION,                            // S3: "eu-west-2"  ·  R2: "auto"
  endpoint: env.STORAGE_ENDPOINT,                        // ← the ONLY R2 difference (undefined for AWS S3)
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  },
});
```

**The one provider difference.** AWS S3 needs no `endpoint` (the SDK derives it from `region`). For **Cloudflare R2** you set:

```ts
region:   "auto",                                        // R2's region is always "auto"
endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
```

Everything else — `createPresignedPost`, the conditions, the object keys — is byte-identical. ([R2 S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/).)

## §3 — Mental model (minimal)

Four ideas; everything else, follow the links in §7.

1. **Presigned POST = a signed, time-limited permission slip.** Our server signs a policy ("you may POST one file, to *this* key, ≤10 MB, of *this* content-type, in the next 5 min"). The client uploads to the bucket using it. We never see the bytes.
2. **`storage_id` is the object key.** It is the bucket-relative path of the blob — e.g. `org_2X.../DOC-0007/title-deed.pdf`. The DB row is metadata; the key is the pointer.
3. **Two kinds of `storage_id` coexist.** Seed data carries **legacy paths** (`public/seed/...`, served as static files); freshly uploaded docs carry **object keys** (in the bucket). The resolver branches on which it is — see §4.
4. **The condition policy is the enforcement.** Client-side `accept="..."` and size checks are UX only. The bucket rejects anything the signed conditions don't allow — that is the real gate (§5).

## §4 — How we use it in Valgate

### The presigned-POST flow (the whole upload, end to end)

```
client                          our server (action)                 bucket (S3/R2)
  │  "I want to upload X.pdf" ─────▶ presignUpload(ctx, meta)
  │                                  ├─ validate MIME+size (server)  ── C4
  │                                  ├─ key = `${ctx.orgId}/${docId}/${name}`
  │                                  └─ createPresignedPost(...)
  │  ◀──────── { url, fields, storageId } ───────┘
  │  POST multipart/form-data (fields + file) ──────────────────────▶ bucket validates
  │                                                                    conditions, stores blob
  │  "uploaded, storageId=…" ─────▶ createDocument(ctx, { …, storageId })
  │                                  └─ INSERT documents row  (storage_id = the key)
```

Bytes flow **client → bucket** only. Our server signs and records metadata; it never proxies the file.

**Signing the upload** — `lib/services/storage.ts`:

```ts
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { nextId } from "./_ids";                          // C8
import type { Ctx } from "@/lib/auth/ctx";

const MAX_BYTES = 10 * 1024 * 1024;                       // 10 MB
const ALLOWED_MIME = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp",
]);

export async function presignUpload(
  ctx: Ctx,
  meta: { name: string; mimeType: string; sizeBytes: number },
) {
  // C4 — recheck at the edge, BEFORE signing. The conditions below are the real gate (§5).
  if (!ALLOWED_MIME.has(meta.mimeType)) throw new Error("Unsupported file type");
  if (meta.sizeBytes > MAX_BYTES) throw new Error("File too large");

  const docId = await nextId("DOC");                      // C8 — id from the counter, not the DB
  const storageId = `${ctx.orgId}/${docId}/${meta.name}`; // the object key → goes into documents.storage_id

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: env.STORAGE_BUCKET,
    Key: storageId,
    Expires: 300,                                         // 5 min — short-lived
    Conditions: [
      ["content-length-range", 1, MAX_BYTES],             // size enforced by the bucket — §5
      ["eq", "$Content-Type", meta.mimeType],             // MIME enforced by the bucket — §5
    ],
    Fields: { "Content-Type": meta.mimeType },            // must echo each condition'd field
  });

  return { url, fields, storageId };                      // storageId is recorded on the row after upload
}
```

### The URL-resolver — handles BOTH legacy paths and object keys

The single place a `storage_id` becomes a loadable URL. The branch on `public/` is what keeps seed documents rendering after cutover (B7 accept-gate):

```ts
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function resolveDocumentUrl(storageId: string): Promise<string> {
  // 1) legacy seed path — served as a static file under /public, no bucket involved
  if (storageId.startsWith("public/")) {
    return "/" + storageId.slice("public/".length);       // "public/seed/x.pdf" → "/seed/x.pdf"
  }
  // 2) object key — mint a short-lived signed GET so a private bucket can be read
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET, Key: storageId,
  }), { expiresIn: 300 });
}
```

If the bucket is configured **public-read** instead, branch 2 is a plain string concat onto `STORAGE_PUBLIC_BASE_URL` — no signing. Pick one per provider; private + signed GET is the default (§5).

### Recording the document

After the client confirms the upload, a normal Drizzle write (see [`drizzle.md`](./drizzle.md) §4) inserts the row with `storageId` set to the key. `documents` is org-scoped like every table ([C3](./_conventions.md#c3)); the canonical shape is `reference/frontend-data-layer/types/document.ts` (`storageId: z.string().min(1)`, `thumbStorageId`, `mimeType`, `sizeBytes`, `kind`).

## §5 — Gotchas & version traps

- **🔴 The conditions are the enforcement — client checks are theatre.** A caller can ignore your form and POST anything. The bucket only accepts what the signed `Conditions` permit, so `content-length-range` and `["eq", "$Content-Type", …]` are what actually reject the 11 MB file and the `.exe` — *not* the `accept` attribute. The edge recheck in `presignUpload` ([C4](./_conventions.md#c4)) just fails fast with a friendly message before signing.
- **`content-length-range` is `[min, max]`, both inclusive.** Use `[1, MAX_BYTES]` — a `0` min lets through empty files. The bucket returns `403 EntityTooLarge` when violated; surface a generic message ([C5](./_conventions.md#c5)).
- **Every condition'd field must be echoed in `Fields` AND posted by the client.** If you condition `$Content-Type` but the client omits the `Content-Type` form field, the POST is rejected. Send `fields` verbatim; the file part goes **last** in the multipart body.
- **🔴 Never expose bucket credentials to the client ([C1](./_conventions.md#c1)).** `lib/services/storage.ts` is `import "server-only"`. The client receives only `{ url, fields }` — a single-use, time-boxed POST. An access key in a client bundle is a bucket-wide breach.
- **Public-read vs signed-GET reads.** A *private* bucket needs a signed GET URL per read (`getSignedUrl`, expires) — links die after `expiresIn`, so resolve at render time, don't cache them in the DB. A *public-read* bucket serves a stable URL but every object is world-readable — only acceptable for non-sensitive blobs. Default to private + signed.
- **R2 region is `auto`, and it needs an explicit `endpoint`.** Copying an S3 snippet that omits `endpoint` silently talks to AWS. The `endpoint` line in §2 is the single thing that retargets the same SDK at R2.
- **Object keys can't start with `/`.** Build keys as `${orgId}/${docId}/${name}` (no leading slash) or the resolver's `public/` branch logic and the bucket layout drift apart.

## §6 — Reusable patterns

**Add a new upload type** (e.g. a thumbnail → `thumbStorageId`):
1. Extend `ALLOWED_MIME` / `MAX_BYTES` if the limits differ.
2. Sign with `presignUpload` — key it under the same `${orgId}/${docId}/` prefix.
3. Store the returned key on the row column; resolve via `resolveDocumentUrl`.

**Tighter, per-prefix conditions** (lock an upload to a folder):

```ts
Conditions: [
  ["content-length-range", 1, MAX_BYTES],
  ["starts-with", "$key", `${ctx.orgId}/`],     // can only land under the caller's org prefix — C3
  ["eq", "$Content-Type", meta.mimeType],
],
```

**Switch provider S3 ⇄ R2** — change only the client config (§2): set/clear `endpoint`, set `region` to `auto`/the AWS region, swap credentials. No call-site changes.

**Delete a blob** (when a document row is removed):

```ts
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
await s3.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: storageId }));
```

## §7 — Going deeper

- `createPresignedPost` API + condition forms — https://www.npmjs.com/package/@aws-sdk/s3-presigned-post
- POST policy & conditions reference (the authoritative list) — https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
- `getSignedUrl` (presigned GET) — https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/
- S3 client commands (Put/Get/Delete) — https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
- R2 S3-API compatibility + endpoint — https://developers.cloudflare.com/r2/api/s3/api/
- R2 presigned URLs guide — https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Recording the row & org-scoping live in [`drizzle.md`](./drizzle.md); env validation in [`env-nextjs.md`](./env-nextjs.md).
