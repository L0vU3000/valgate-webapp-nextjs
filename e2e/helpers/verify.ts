/**
 * High-level assertion helpers for 🔴 side-effect items:
 * cascade deletion, set-null survivors, activity rows, S3 file removal.
 */
import { expect } from '@playwright/test'
import { rowExists, paymentPropertyNulled, getLastActivity } from './db'

export async function assertCascadeGone(ids: {
  propertyId?: string
  leaseId?: string
  paymentId?: string
  documentId?: string
  folderId?: string
  coOwnerId?: string
  safetyRiskId?: string
}): Promise<void> {
  if (ids.propertyId) expect(await rowExists('properties', ids.propertyId)).toBe(false)
  if (ids.leaseId)    expect(await rowExists('leases', ids.leaseId)).toBe(false)
  if (ids.documentId) expect(await rowExists('documents', ids.documentId)).toBe(false)
  if (ids.folderId)   expect(await rowExists('folders', ids.folderId)).toBe(false)
  if (ids.coOwnerId)  expect(await rowExists('co_owners', ids.coOwnerId)).toBe(false)
  if (ids.safetyRiskId) expect(await rowExists('safety_risks', ids.safetyRiskId)).toBe(false)
}

// Checks that a payment survived property deletion with property_id set to null.
export async function assertSetNullSurvivors(paymentId: string): Promise<void> {
  expect(await paymentPropertyNulled(paymentId)).toBe(true)
}

export async function assertActivityRow(entity: string, action: string): Promise<void> {
  const row = await getLastActivity(entity, action)
  expect(row, `Expected activity row entity="${entity}" action="${action}"`).not.toBeNull()
}

export async function assertS3ObjectGone(storageId: string): Promise<void> {
  // The default e2e document helper creates only a database row with a fabricated storage
  // id; it does not upload an object. A HEAD request for that id cannot prove deletion and
  // private buckets may answer 403 for missing objects. Run this external integration check
  // only in an environment that explicitly provisions an e2e storage object first — so it is
  // off by default and opts in via E2E_VERIFY_S3=true.
  if (process.env.E2E_VERIFY_S3 !== 'true') {
    console.log(`[SKIP] S3 check for ${storageId} — E2E_VERIFY_S3 is not true`)
    return
  }

  const bucket = process.env.STORAGE_BUCKET
  if (!bucket) {
    console.log(`[SKIP] S3 check for ${storageId} — STORAGE_BUCKET not in .env.e2e`)
    return
  }
  const { S3Client, HeadObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    region: process.env.STORAGE_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
  })
  let gone = false
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: storageId }))
  } catch (e: any) {
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) gone = true
    else throw e
  }
  expect(gone, `S3 object ${storageId} still exists after deletion`).toBe(true)
}
