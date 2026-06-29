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

// Deletes one stored object from the S3 bucket so we don't leave orphaned bytes
// behind after a document row is removed (this was the P1 storage leak).
//
// This is BEST-EFFORT on purpose: the caller (deleteDocument in the service layer)
// has already removed the database row by the time we get here, so if the S3 delete
// fails we must NOT throw — that would make the whole delete look like it failed even
// though the row is gone. Instead we log the failure and move on. The caller is
// expected to wrap this in a try/catch as a second line of defence.
//
// Returns true when the object was deleted (or storage isn't configured / the id is a
// legacy local-storage id, both of which mean "nothing to delete in S3"), false when an
// actual S3 delete attempt failed.
export async function deleteStorageObject(storageId: string): Promise<boolean> {
  // Legacy/local placeholder ids never lived in S3 — nothing to clean up.
  if (storageId.startsWith("_storage/")) return true;
  try {
    const { client, bucket } = getS3();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageId }));
    return true;
  } catch (err) {
    // Storage may be unconfigured in demo/dev (getS3 throws) or the delete may fail.
    // Either way, don't blow up the caller — the row is already gone. Log loudly.
    console.error("deleteStorageObject: failed to remove S3 object", storageId, err);
    return false;
  }

}
