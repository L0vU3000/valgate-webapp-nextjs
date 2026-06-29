import "server-only"; // C1
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { nextId, type Ctx } from "@/lib/services/_mapping";
import { MAX_BYTES, ALLOWED_MIME } from "@/lib/upload-constants";

export { MAX_BYTES, ALLOWED_MIME };

function assertStorageConfigured(): { bucket: string; region: string; accessKeyId: string; secretAccessKey: string } {
  const { STORAGE_BUCKET: bucket, STORAGE_REGION: region, STORAGE_ACCESS_KEY_ID: accessKeyId, STORAGE_SECRET_ACCESS_KEY: secretAccessKey } = env;
  if (!bucket || !region || !accessKeyId || !secretAccessKey)
    throw new Error("Storage not configured: STORAGE_BUCKET/REGION/ACCESS_KEY_ID/SECRET_ACCESS_KEY env vars missing");
  return { bucket, region, accessKeyId, secretAccessKey };
}

function getS3(): { client: S3Client; bucket: string } {
  const { bucket, region, accessKeyId, secretAccessKey } = assertStorageConfigured();
  return {
    client: new S3Client({ region, credentials: { accessKeyId, secretAccessKey } }),
    bucket,
  };
}

export async function presignUpload(
  ctx: Ctx,
  { name, mimeType, sizeBytes }: { name: string; mimeType: string; sizeBytes: number },
): Promise<{ url: string; fields: Record<string, string>; storageId: string }> {
  if (!ALLOWED_MIME.has(mimeType)) throw new Error(`MIME type not allowed: ${mimeType}`);
  if (sizeBytes > MAX_BYTES) throw new Error(`File too large: max ${MAX_BYTES} bytes`);
  const { client, bucket } = getS3();
  // ponytail: DOC counter here is only for key uniqueness; abandoned uploads burn a counter slot (gaps are fine)
  const storageId = `${ctx.orgId}/${await nextId("DOC")}/${name}`;
  const { url, fields } = await createPresignedPost(client, {
    Bucket: bucket,
    Key: storageId,
    Expires: 300,
    Conditions: [
      ["content-length-range", 1, MAX_BYTES],
      ["eq", "$Content-Type", mimeType],
    ],
    Fields: { "Content-Type": mimeType },
  });
  return { url, fields, storageId };
}

export async function resolveDocumentUrl(storageId: string): Promise<string> {
  if (storageId.startsWith("_storage/")) return `/${storageId}`;
  const { client, bucket } = getS3();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: storageId }), { expiresIn: 300 });
}

// Deletes a single object from S3 by its storage key. Used when a staged draft file is removed
// or a draft is discarded/expired, so abandoned uploads don't linger in the bucket.
//
// What can go wrong: if storage isn't configured, getS3() throws (callers treat that as a soft
// failure and still remove the DB row). S3 DeleteObject is idempotent — deleting a key that no
// longer exists succeeds quietly — so a double-delete or a missing object is not an error.
// The seed's local `_storage/` keys never reach here (they have no S3 object); callers skip them.
export async function deleteObject(storageId: string): Promise<void> {
  if (storageId.startsWith("_storage/")) return; // local seed asset — nothing in S3 to delete
  const { client, bucket } = getS3();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageId }));
}
