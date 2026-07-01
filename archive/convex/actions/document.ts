"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal, api } from "../_generated/api";
import { buildDocKey, isKeyInOrg, isDocKeyFor } from "../lib/s3Keys";
import { logger as appLogger } from "../../lib/logger";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { s3Client } from "../../lib/services/s3Client";

const PRESIGN_ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const PRESIGN_MAX_SIZE = 25 * 1024 * 1024; // 25MB
const PRESIGN_MAX_FILES = 5;

// ========= createPresign (documents + document_files) =========

export const createPresign = action({
  args: {
    orgId: v.union(v.id("orgs"), v.string()), // allow Clerk org id; we resolve Convex org internally
    propertyId: v.optional(v.id("property")),
    landId: v.optional(v.string()),
    // Optional: attach new files to an existing business document instead of creating one per file
    documentId: v.optional(v.id("document")),
    subdir: v.optional(v.union(v.literal("temporary"), v.literal("permanent"))),
    files: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
        size: v.number(),
        category: v.optional(v.string()),
      }),
    ),
    traceId: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    bucket: v.optional(v.string()),
    items: v.optional(
      v.array(
        v.object({
          docId: v.string(), // document id
          fileId: v.string(), // document_files id
          rid: v.string(),
          key: v.string(),
          mime: v.string(),
          category: v.optional(v.string()),
          putUrl: v.optional(v.string()),
          sseHeaders: v.optional(v.record(v.string(), v.string())),
          post: v.optional(
            v.object({
              url: v.string(),
              fields: v.record(v.string(), v.string()),
            }),
          ),
        }),
      ),
    ),
    reason: v.optional(v.string()),
    message: v.optional(v.string()),
    traceId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const traceId = args.traceId ?? crypto.randomUUID();
    if (!identity) {
      return {
        ok: false,
        reason: "auth",
        message: "Not authenticated",
        traceId,
      };
    }
    const Bucket = process.env.S3_BUCKET_PRIVATE;
    if (!Bucket) {
      return {
        ok: false,
        reason: "config",
        message: "Missing S3 bucket",
        traceId,
      };
    }
    if (!Array.isArray(args.files) || args.files.length === 0) {
      return {
        ok: false,
        reason: "validation",
        message: "files_required",
        traceId,
      };
    }
    if (args.files.length > PRESIGN_MAX_FILES) {
      return {
        ok: false,
        reason: "validation",
        message: "files_limit_exceeded",
        traceId,
      };
    }

    const baseLog = appLogger.child({
      action: "s3_presign_documents",
      actor: identity.subject,
      traceId,
    });

    const resolvedOrgId =
      typeof args.orgId === "string"
        ? await ctx.runQuery(
            (internal as any)["queries/identity"].getOrgByClerkId,
            { clerkOrgId: args.orgId },
          )
        : args.orgId;
    if (!resolvedOrgId) {
      baseLog.warn("organization_not_found", { orgId: args.orgId });
      return {
        ok: false,
        reason: "auth",
        message: "organization_not_linked",
        traceId,
      };
    }
    const membership = await ctx.runQuery(
      (internal as any)["queries/identity"].getMembershipForCurrentUser,
      { orgId: resolvedOrgId as any },
    );
    if (
      !membership ||
      !["owner", "admin", "editor"].includes((membership as any).role)
    ) {
      baseLog.warn("forbidden_presign", { orgId: resolvedOrgId });
      return { ok: false, reason: "auth", message: "forbidden", traceId };
    }

    const s3 = s3Client;
    const results: Array<{
      docId: string;
      fileId: string;
      rid: string;
      putUrl: string;
      key: string;
      mime: string;
      category?: string;
      sseHeaders?: Record<string, string>;
      post?: { url: string; fields: Record<string, string> };
    }> = [];

    const mode =
      (args.subdir === "permanent" ? "permanent" : "temporary") as
        | "temporary"
        | "permanent";
    const propertyScope = args.propertyId
      ? String(args.propertyId)
      : String(args.landId || "draft-property");

    let batchDocId: string | null = null;
    let docForAggregation: any | null = null;
    let nextPageIndex = 0;
    let currentFileCount = 0;
    let currentPageCount = 0;

    try {
      // If a specific documentId is provided, validate it up front
      // If a specific documentId is provided, validate it up front
      let existingDoc: any | null = null;
      if (args.documentId) {
        existingDoc = await ctx.runQuery(
          (internal as any).queries.documents.getDocument,
          { id: args.documentId as any } as any,
        );
        if (!existingDoc) {
          throw new Error("document_not_found");
        }
        if (String(existingDoc.orgId) !== String(resolvedOrgId)) {
          throw new Error("document_org_mismatch");
        }
        if (
          args.propertyId &&
          existingDoc.propertyId &&
          String(existingDoc.propertyId) !== String(args.propertyId)
        ) {
          throw new Error("document_property_mismatch");
        }
        batchDocId = String(existingDoc._id || existingDoc.id);
        docForAggregation = existingDoc;
        const existingFiles = await ctx.runQuery(
          (internal as any).queries.documents.filesByDocument,
          { documentId: batchDocId as any } as any,
        );
        const filesArr: any[] = Array.isArray(existingFiles)
          ? (existingFiles as any[])
          : [];
        currentFileCount =
          typeof existingDoc.fileCount === "number"
            ? existingDoc.fileCount
            : filesArr.length;
        const maxIndex = filesArr.reduce(
          (max, file) =>
            typeof file.pageIndex === "number"
              ? Math.max(max, file.pageIndex)
              : max,
          -1,
        );
        nextPageIndex = maxIndex + 1;
        currentPageCount =
          typeof existingDoc.pageCount === "number"
            ? existingDoc.pageCount
            : Math.max(0, nextPageIndex);
      } else {
        const createdDoc = await ctx.runMutation(
          (internal as any).mutations.documents.createDocument,
          {
            orgId: resolvedOrgId as any,
            propertyId: args.propertyId,
            category: args.files?.[0]?.category || "legal",
            title: undefined,
            description: undefined,
            status: "expected",
            metadata: undefined,
          } as any,
        );
        batchDocId = (createdDoc as any).id as string;
        docForAggregation = {
          orgId: resolvedOrgId,
          propertyId: args.propertyId,
          fileCount: 0,
          pageCount: 0,
          primaryFileId: undefined,
        };
        currentFileCount = 0;
        nextPageIndex = 0;
        currentPageCount = 0;
      }

      for (const f of args.files) {
        if (!f.name?.trim() || !f.type?.trim()) {
          baseLog.warn("invalid_file_metadata", {
            fileName: f.name,
            mime: f.type,
          });
          return {
            ok: false,
            reason: "validation",
            message: "file_metadata_invalid",
            traceId,
          };
        }
        if (!PRESIGN_ALLOWED_MIME.has(f.type)) {
          return {
            ok: false,
            reason: "validation",
            message: `unsupported_mime:${f.type}`,
            traceId,
          };
        }
        if (f.size <= 0 || f.size > PRESIGN_MAX_SIZE) {
          return {
            ok: false,
            reason: "validation",
            message: "file_size_invalid",
            traceId,
          };
        }

        // 1) Resolve business document: either use existing or the batch-created one
        const docId = batchDocId as string;

        // 2) Compute file key under this document
        const rid = crypto.randomUUID();
        const key = buildDocKey({
          mode,
          orgId: String(resolvedOrgId),
          propertyId: propertyScope,
          docId: String(docId),
          rid,
          safeName: f.name,
        });

        const safeTitle = f.name?.trim();

        // 3) Determine page index for new file (append after existing pages)
        const pageIndex = nextPageIndex;
        nextPageIndex += 1;

        // 4) Create file row for this document
        const createdFile = await ctx.runMutation(
          (internal as any).mutations.documents.createFile,
          {
            orgId: resolvedOrgId as any,
            documentId: docId as any,
            propertyId: args.propertyId,
            pageIndex,
            title: safeTitle || undefined,
            caption: undefined,
            description: undefined,
            s3Bucket: Bucket,
            s3Key: key,
            s3VersionId: undefined,
            mimeType: f.type,
            sizeBytes: f.size,
            checksumSha256: undefined,
            rid,
            uploadSessionId: undefined,
            source: "upload",
            ingestionStatus: "expected",
            ocrStatus: undefined,
            processedRawKey: undefined,
            processedRedactedKey: undefined,
            structuredKey: undefined,
            errorReason: undefined,
            pageCountHint: undefined,
            metadata: undefined,
          } as any,
        );
        const fileId = (createdFile as any).id as string;

        // 5) Update document aggregates
        const docPatch: any = {};
        currentFileCount += 1;
        currentPageCount = Math.max(currentPageCount, pageIndex + 1);
        docPatch.fileCount = currentFileCount;
        docPatch.pageCount = currentPageCount;
        if (!docForAggregation?.primaryFileId) {
          docPatch.primaryFileId = fileId as any;
        }
        await ctx.runMutation(
          (internal as any).mutations.documents.updateDocument,
          {
            id: docId as any,
            fields: docPatch,
          } as any,
        );
        if (docForAggregation) {
          docForAggregation.primaryFileId =
            docForAggregation.primaryFileId || fileId;
        }

        // 5) Generate presigned PUT and POST
        const kmsKeyId = process.env.S3_KMS_KEY_ID;
        const putUrl = await getSignedUrl(
          s3,
          new PutObjectCommand({
            Bucket,
            Key: key,
            ContentType: f.type,
            ServerSideEncryption: "aws:kms",
            ...(kmsKeyId ? { SSEKMSKeyId: kmsKeyId } : {}),
          }),
          { expiresIn: 120 },
        );

        const postConditions: Array<any> = [
          ["content-length-range", 0, PRESIGN_MAX_SIZE],
          ["eq", "$Content-Type", f.type],
          ["eq", "$x-amz-server-side-encryption", "aws:kms"],
        ];
        if (kmsKeyId) {
          postConditions.push({
            "x-amz-server-side-encryption-aws-kms-key-id": kmsKeyId,
          });
        }
        const post = await createPresignedPost(s3, {
          Bucket,
          Key: key,
          Conditions: postConditions as any,
          Fields: {
            key,
            "Content-Type": f.type,
            "x-amz-server-side-encryption": "aws:kms",
            ...(kmsKeyId
              ? {
                  "x-amz-server-side-encryption-aws-kms-key-id": kmsKeyId,
                }
              : {}),
          },
          Expires: 120,
        });
        const sseHeaders: Record<string, string> = {
          "x-amz-server-side-encryption": "aws:kms",
          ...(kmsKeyId
            ? { "x-amz-server-side-encryption-aws-kms-key-id": kmsKeyId }
            : {}),
        };

        results.push({
          docId: String(docId),
          fileId: String(fileId),
          rid,
          putUrl,
          key,
          mime: f.type,
          category: f.category,
          sseHeaders,
          post: {
            url: post.url,
            fields: post.fields as Record<string, string>,
          },
        });
        baseLog.info("presign_issued_document", {
          orgId: String(resolvedOrgId),
          docId: String(docId),
          fileId: String(fileId),
          key,
          mime: f.type,
          mode,
        });
      }
    } catch (error: any) {
      baseLog.error("presign_generation_failed_documents", {
        message: error?.message,
        traceId,
      });
      return {
        ok: false,
        reason: "storage",
        message: error?.message || "presign_failed",
        traceId,
      };
    }

    return { ok: true, bucket: Bucket, items: results, traceId };
  },
});

// ========= runOCR (stateless, operates on document_files URLs) =========

// export const runOCR = action({
//   args: {
//     orgId: v.union(v.id("orgs"), v.string()),
//     propertyId: v.optional(v.id("property")),
//     documents: v.array(
//       v.object({
//         fileId: v.id("document_files"),
//         key: v.string(),
//         category: v.optional(v.string()),
//         getUrl: v.string(),
//         mime: v.string(),
//       }),
//     ),
//   },
//   handler: async (ctx, args) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) throw new Error("Not authenticated");
//     // Resolve and validate org membership (writer since we may update state elsewhere)
//     const resolvedOrgId =
//       typeof args.orgId === "string"
//         ? await ctx.runQuery(
//             (internal as any)["queries/identity"].getOrgByClerkId,
//             { clerkOrgId: args.orgId },
//           )
//         : args.orgId;
//     if (!resolvedOrgId) {
//       throw new Error("Organization not found or not linked");
//     }
//     const membership = await ctx.runQuery(
//       (internal as any)["queries/identity"].getMembershipForCurrentUser,
//       { orgId: resolvedOrgId as any },
//     );
//     if (
//       !membership ||
//       !["owner", "admin", "editor"].includes((membership as any).role)
//     ) {
//       throw new Error("Forbidden");
//     }

//     const apiKey = process.env.OPENAI_API_KEY_OCR;
//     if (!apiKey) throw new Error("Missing OPENAI_API_KEY_OCR");

//     const results: Array<{
//       fileId: string;
//       key: string;
//       structured: Record<string, unknown>;
//     }> = [];

//     for (const d of args.documents) {
//       const prompt = `You are an OCR & extraction agent for land/property documents in Cambodia (and generally). Extract a concise JSON with fields if present:
// {
//   "titleType": string | null,
//   "referenceCode": string | null,
//   "sizeArea": string | number | null,
//   "issueDate": string | null,
//   "ownerName": string | null,
//   "address": string | null,
//   "notes": string | null
// }
// If a field is unknown, set it to null. Return only JSON.`;

//       try {
//         let response: Response;
//         if (d.mime.startsWith("image/")) {
//           response = await fetch("https://api.openai.com/v1/chat/completions", {
//             method: "POST",
//             headers: {
//               Authorization: `Bearer ${apiKey}`,
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//               model: "gpt-4o-mini",
//               response_format: { type: "json_object" },
//               messages: [
//                 {
//                   role: "user",
//                   content: [
//                     { type: "text", text: prompt },
//                     { type: "image_url", image_url: { url: d.getUrl } },
//                   ],
//                 },
//               ],
//             }),
//           });
//         } else if (d.mime === "application/pdf") {
//           const pdfRes = await fetch(d.getUrl);
//           if (!pdfRes.ok) throw new Error(`fetch_pdf_failed:${pdfRes.status}`);
//           const pdfBuf = await pdfRes.arrayBuffer();
//           const form = new FormData();
//           form.append(
//             "file",
//             new Blob([pdfBuf], { type: "application/pdf" }),
//             "document.pdf",
//           );
//           form.append("purpose", "assistants");
//           const fileUpload = await fetch("https://api.openai.com/v1/files", {
//             method: "POST",
//             headers: { Authorization: `Bearer ${apiKey}` },
//             body: form,
//           });
//           if (!fileUpload.ok) {
//             const errText = await fileUpload.text();
//             results.push({
//               fileId: String(d.fileId),
//               key: d.key,
//               structured: {
//                 error: "openai_file_upload_error",
//                 detail: errText,
//               },
//             });
//             continue;
//           }
//           const uploaded = await fileUpload.json();
//           const fileId = uploaded?.id;
//           response = await fetch("https://api.openai.com/v1/chat/completions", {
//             method: "POST",
//             headers: {
//               Authorization: `Bearer ${apiKey}`,
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//               model: "gpt-4o-mini",
//               response_format: { type: "json_object" },
//               messages: [
//                 {
//                   role: "user",
//                   content: [
//                     { type: "text", text: prompt },
//                     { type: "file", file_id: fileId },
//                   ],
//                 },
//               ],
//             }),
//           });
//         } else {
//           results.push({
//             fileId: String(d.fileId),
//             key: d.key,
//             structured: { error: "unsupported_mime", mime: d.mime },
//           });
//           continue;
//         }
//         if (!response.ok) {
//           const errText = await response.text();
//           results.push({
//             fileId: String(d.fileId),
//             key: d.key,
//             structured: { error: "openai_error", detail: errText },
//           });
//           continue;
//         }
//         const data = await response.json();
//         const text = data?.choices?.[0]?.message?.content ?? "{}";
//         let parsed: Record<string, unknown> = {};
//         try {
//           parsed = JSON.parse(text);
//         } catch {
//           parsed = { raw: text };
//         }
//         results.push({
//           fileId: String(d.fileId),
//           key: d.key,
//           structured: parsed,
//         });
//       } catch (e: any) {
//         results.push({
//           fileId: String(d.fileId),
//           key: d.key,
//           structured: { error: "request_failed", detail: e?.message },
//         });
//       }
//     }

//     return { results };
//   },
// });

// ========= startOcrFromStaging (document_files, VersionId) =========

export const startOcrFromStaging = action({
  args: {
    orgId: v.union(v.id("orgs"), v.string()),
    documents: v.array(
      v.object({
        fileId: v.id("document_files"),
        key: v.string(),
        versionId: v.optional(v.string()),
        mime: v.string(),
        category: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const resolvedOrgId =
      typeof args.orgId === "string"
        ? await ctx.runQuery(
            (internal as any)["queries/identity"].getOrgByClerkId,
            { clerkOrgId: args.orgId },
          )
        : args.orgId;
    if (!resolvedOrgId) throw new Error("Organization not found or not linked");
    const membership = await ctx.runQuery(
      (internal as any)["queries/identity"].getMembershipForCurrentUser,
      { orgId: resolvedOrgId as any },
    );
    if (
      !membership ||
      !["owner", "admin", "editor"].includes((membership as any).role)
    ) {
      throw new Error("Forbidden");
    }

    const apiKey = process.env.OPENAI_API_KEY_OCR;
    const Bucket = process.env.S3_BUCKET_PRIVATE!;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY_OCR");

    const s3 = s3Client;

    const results: Array<{
      fileId: string;
      key: string;
      structured: Record<string, unknown>;
    }> = [];

    for (const d of args.documents) {
      // Mark file as uploaded in staging
      await ctx.runMutation(
        (internal as any).mutations.documents.updateFile,
        {
          id: d.fileId as any,
          fields: {
            ocrStatus: "uploaded",
            s3VersionId: d.versionId,
          },
        } as any,
      );

      try {
        const cmd = new GetObjectCommand({
          Bucket,
          Key: d.key,
          VersionId: d.versionId,
        });
        const obj = await s3.send(cmd);
        const bodyArrayBuffer = await obj.Body?.transformToByteArray();
        if (!bodyArrayBuffer) throw new Error("empty_s3_object");
        const base64 = Buffer.from(bodyArrayBuffer).toString("base64");

        const dataUrl = `data:${d.mime};base64,${base64}`;
        const isPdf = d.mime === "application/pdf";

        let merged: Record<string, unknown> = {};
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: isPdf ? "gpt-5" : "gpt-4.1-mini",
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "property_document_extraction",
                  strict: true,
                  schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      titleType: {
                        type: ["string", "null"],
                        description: "Title type such as soft/hard/other",
                      },
                      titleTypeOther: { type: ["string", "null"] },
                      parcelCodeDocuments: {
                        type: ["string", "null"],
                        description:
                          "Official parcel code from document if present",
                      },
                      referenceCode: {
                        type: ["string", "null"],
                        description:
                          "Any reference code on the document",
                      },
                      sizeArea: {
                        type: ["string", "number", "null"],
                        description:
                          "Area size value as seen on the document",
                      },
                      issueDate: {
                        type: ["string", "null"],
                        description:
                          "ISO date if detected (YYYY-MM-DD)",
                      },
                      ownerName: {
                        type: ["string", "null"],
                        description: "Primary owner name if legible",
                      },
                      notes: { type: ["string", "null"] },
                      buildingName: {
                        type: ["string", "null"],
                        description:
                          "Building name for condos/apartments",
                      },
                      floorNumber: {
                        type: ["string", "number", "null"],
                        description: "Floor number for units",
                      },
                      unitNumber: {
                        type: ["string", "null"],
                        description: "Unit number/apartment number",
                      },
                      buildingType: {
                        type: ["string", "null"],
                        description:
                          "Building type such as condominium, apartment, house, etc.",
                      },
                      address: {
                        type: ["object", "null"],
                        additionalProperties: false,
                        properties: {
                          address: { type: ["string", "null"] },
                          street: { type: ["string", "null"] },
                          sangkat: { type: ["string", "null"] },
                          phum: { type: ["string", "null"] },
                          district: { type: ["string", "null"] },
                          province: { type: ["string", "null"] },
                          country: { type: ["string", "null"] },
                          zipCode: { type: ["string", "null"] },
                        },
                        required: [
                          "address",
                          "street",
                          "sangkat",
                          "phum",
                          "district",
                          "province",
                          "country",
                          "zipCode",
                        ],
                      },
                      owners: {
                        type: ["array", "null"],
                        description: "Detected owners on the document",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            ownerType: {
                              type: ["string", "null"],
                              description: "person or company",
                            },
                            firstName: { type: ["string", "null"] },
                            lastName: { type: ["string", "null"] },
                            displayName: { type: ["string", "null"] },
                            dateOfBirth: { type: ["string", "null"] },
                            nationalId: { type: ["string", "null"] },
                            email: { type: ["string", "null"] },
                            phone: { type: ["string", "null"] },
                            address: { type: ["string", "null"] },
                            companyName: { type: ["string", "null"] },
                            registrationNumber: {
                              type: ["string", "null"],
                            },
                            relationship: { type: ["string", "null"] },
                            share: {
                              type: ["number", "string", "null"],
                            },
                            acquisitionType: {
                              type: ["string", "null"],
                              description:
                                "How the owner acquired the property (purchase, inheritance, etc.)",
                            },
                            acquisitionDate: {
                              type: ["string", "null"],
                              description:
                                "ISO date when property was acquired (YYYY-MM-DD)",
                            },
                            purchaseAmount: {
                              type: ["string", "number", "null"],
                              description:
                                "Purchase amount for this owner's acquisition",
                            },
                            purchaseCurrency: {
                              type: ["string", "null"],
                              description: "Currency for purchase amount",
                            },
                            notes: { type: ["string", "null"] },
                          },
                          required: [
                            "ownerType",
                            "firstName",
                            "lastName",
                            "displayName",
                            "dateOfBirth",
                            "nationalId",
                            "email",
                            "phone",
                            "address",
                            "companyName",
                            "registrationNumber",
                            "relationship",
                            "share",
                            "acquisitionType",
                            "acquisitionDate",
                            "purchaseAmount",
                            "purchaseCurrency",
                            "notes",
                          ],
                        },
                      },
                      finance: {
                        type: ["object", "null"],
                        additionalProperties: false,
                        properties: {
                          purchaseAmount: {
                            type: ["string", "number", "null"],
                          },
                          purchaseCurrency: { type: ["string", "null"] },
                          purchaseDate: { type: ["string", "null"] },
                          lastValuationAmount: {
                            type: ["string", "number", "null"],
                          },
                          lastValuationCurrency: {
                            type: ["string", "null"],
                          },
                          lastValuationDate: { type: ["string", "null"] },
                          valuationBy: { type: ["string", "null"] },
                          taxAmount: {
                            type: ["string", "number", "null"],
                          },
                          taxCurrency: { type: ["string", "null"] },
                          taxPeriod: { type: ["string", "null"] },
                          taxStatus: { type: ["string", "null"] },
                          status: { type: ["string", "null"] },
                          rentalIncomeAmount: {
                            type: ["string", "number", "null"],
                          },
                          rentalIncomeCurrency: {
                            type: ["string", "null"],
                          },
                          rentalIncomePeriod: {
                            type: ["string", "null"],
                          },
                          insuranceProvider: { type: ["string", "null"] },
                          insurancePolicyNumber: {
                            type: ["string", "null"],
                          },
                          insuranceCoverageAmount: {
                            type: ["string", "number", "null"],
                          },
                          insuranceCoverageCurrency: {
                            type: ["string", "null"],
                          },
                          insuranceExpiryDate: {
                            type: ["string", "null"],
                          },
                          insurancePremiumAmount: {
                            type: ["string", "number", "null"],
                          },
                          insurancePremiumCurrency: {
                            type: ["string", "null"],
                          },
                          insurancePremiumPeriod: {
                            type: ["string", "null"],
                          },
                          notes: {
                            type: ["string", "null"],
                            description:
                              "Freeform notes; if absent set to 'none'",
                          },
                          customJson: {
                            type: ["string", "null"],
                            description:
                              "JSON string of key-value pairs; if absent set to '[{\"label\":\"none\",\"value\":\"none\"}]'",
                          },
                        },
                        required: [
                          "purchaseAmount",
                          "purchaseCurrency",
                          "purchaseDate",
                          "lastValuationAmount",
                          "lastValuationCurrency",
                          "lastValuationDate",
                          "valuationBy",
                          "taxAmount",
                          "taxCurrency",
                          "taxPeriod",
                          "taxStatus",
                          "status",
                          "rentalIncomeAmount",
                          "rentalIncomeCurrency",
                          "rentalIncomePeriod",
                          "insuranceProvider",
                          "insurancePolicyNumber",
                          "insuranceCoverageAmount",
                          "insuranceCoverageCurrency",
                          "insuranceExpiryDate",
                          "insurancePremiumAmount",
                          "insurancePremiumCurrency",
                          "insurancePremiumPeriod",
                          "notes",
                          "customJson",
                        ],
                      },
                    },
                    required: [
                      "titleType",
                      "titleTypeOther",
                      "parcelCodeDocuments",
                      "referenceCode",
                      "sizeArea",
                      "issueDate",
                      "ownerName",
                      "notes",
                      "buildingName",
                      "floorNumber",
                      "unitNumber",
                      "buildingType",
                      "address",
                      "owners",
                      "finance",
                    ],
                  },
                },
              },
              messages: [
                {
                  role: "user",
                  content: isPdf
                    ? [
                        {
                          type: "file",
                          file: {
                            filename: "document.pdf",
                            file_data: dataUrl,
                          },
                        },
                        {
                          type: "text",
                          text: "You are an OCR & extraction agent for khmer property documents. Return strict JSON for the provided schema. If a field is unknown, set it to null. Populate owners[] with any owner/person or company details you can find. Populate finance fields only if explicitly present on the document. For finance defaults: if notes is missing, set to 'none'; if customJson is missing, set to '[{\\\"label\\\":\\\"none\\\",\\\"value\\\":\\\"none\\\"}]'. For sizeArea, prefer numeric value without units. For dates, prefer ISO YYYY-MM-DD.",
                        },
                      ]
                    : [
                        {
                          type: "text",
                          text: "You are an OCR & extraction agent for khmer property documents. Return strict JSON for the provided schema. If a field is unknown, set it to null. Populate owners[] with any owner/person or company details you can find. Populate finance fields only if explicitly present on the document. For finance defaults: if notes is missing, set to 'none'; if customJson is missing, set to '[{\\\"label\\\":\\\"none\\\",\\\"value\\\":\\\"none\\\"}]'. For sizeArea, prefer numeric value without units. For dates, prefer ISO YYYY-MM-DD.",
                        },
                        { type: "image_url", image_url: { url: dataUrl } },
                      ],
                },
              ],
            }),
          },
        );
        if (!response.ok) {
          const errText = await response.text();
          merged = {
            ...(merged || {}),
            error: "openai_error",
            detail: errText,
          } as any;
        } else {
          const data = await response.json();
          const text = data?.choices?.[0]?.message?.content ?? "{}";
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = { raw: text };
          }
          merged = { ...(merged || {}), ...(parsed || {}) };
        }

        const structuredKey = `${d.key}.structured.json`;
        const kmsKeyId = process.env.S3_KMS_KEY_ID;
        const put = new PutObjectCommand({
          Bucket,
          Key: structuredKey,
          Body: Buffer.from(JSON.stringify(merged)),
          ContentType: "application/json",
          ServerSideEncryption: "aws:kms",
          ...(kmsKeyId ? { SSEKMSKeyId: kmsKeyId } : {}),
        });
        await s3.send(put);
        await ctx.runMutation(
          (internal as any).mutations.documents.updateFile,
          {
            id: d.fileId as any,
            fields: {
              ocrStatus: "model_done",
              structuredKey,
            },
          } as any,
        );
        results.push({
          fileId: String(d.fileId),
          key: d.key,
          structured: merged,
        });
      } catch (e: any) {
        await ctx.runMutation(
          (internal as any).mutations.documents.updateFile,
          {
            id: d.fileId as any,
            fields: {
              ocrStatus: "failed",
              errorReason: e?.message || "ocr_failed",
            },
          } as any,
        );
        results.push({
          fileId: String(d.fileId),
          key: d.key,
          structured: { error: "request_failed", detail: e?.message },
        });
      }
    }

    return { results };
  },
});

// =========  (document_files, VersionId) =========

export const startOcrForTranscription = action({
  args: {
    orgId: v.union(v.id("orgs"), v.string()),
    documents: v.array(
      v.object({
        fileId: v.id("document_files"),
        key: v.string(),
        versionId: v.optional(v.string()),
        mime: v.string(),
      }),
    ),
  },
  returns: v.object({
    results: v.array(
      v.object({
        fileId: v.string(),
        key: v.string(),
        transcription: v.optional(
          v.object({
            en: v.optional(v.string()),
            km: v.optional(v.string()),
          }),
        ),
        error: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const resolvedOrgId =
      typeof args.orgId === "string"
        ? await ctx.runQuery(
            (internal as any)["queries/identity"].getOrgByClerkId,
            { clerkOrgId: args.orgId },
          )
        : args.orgId;
    if (!resolvedOrgId) throw new Error("Organization not found or not linked");
    const membership = await ctx.runQuery(
      (internal as any)["queries/identity"].getMembershipForCurrentUser,
      { orgId: resolvedOrgId as any },
    );
    if (
      !membership ||
      !["owner", "admin", "editor"].includes((membership as any).role)
    ) {
      throw new Error("Forbidden");
    }

    const apiKey = process.env.OPENAI_API_KEY_OCR;
    const Bucket = process.env.S3_BUCKET_PRIVATE!;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY_OCR");

    const s3 = s3Client;

    const results: Array<{
      fileId: string;
      key: string;
      transcription?: { en?: string; km?: string };
      error?: string;
    }> = [];

    for (const d of args.documents) {
      // Mark file as transcription pending in staging
      await ctx.runMutation(
        (internal as any).mutations.documents.updateFile,
        {
          id: d.fileId as any,
          fields: {
            ocrStatus: "transcription_pending",
            s3VersionId: d.versionId,
          },
        } as any,
      );

      try {
        const cmd = new GetObjectCommand({
          Bucket,
          Key: d.key,
          VersionId: d.versionId,
        });
        const obj = await s3.send(cmd);
        const bodyArrayBuffer = await obj.Body?.transformToByteArray();
        if (!bodyArrayBuffer) throw new Error("empty_s3_object");
        const base64 = Buffer.from(bodyArrayBuffer).toString("base64");

        const dataUrl = `data:${d.mime};base64,${base64}`;
        const isPdf = d.mime === "application/pdf";

        console.log("dataUrl",dataUrl);

        let en: string | undefined;
        let km: string | undefined;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: isPdf ? "gpt-5" : "gpt-4.1-mini",
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "document_transcription_en_km",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    en: {
                      type: ["string", "null"],
                      description:
                        "Full natural-language transcription or detailed summary of the document contents in English.",
                    },
                    km: {
                      type: ["string", "null"],
                      description:
                        "Full natural-language transcription or detailed summary of the document contents in Khmer.",
                    },
                  },
                  required: ["en", "km"],
                },
              },
            },
            messages: [
              {
                role: "user",
                content: isPdf
                  ? [
                      {
                        type: "file",
                        file: {
                          filename: "document.pdf",
                          file_data: dataUrl,
                        },
                      },
                      {
                        type: "text",
                        text: "You are an OCR & transcription agent for Khmer property documents. Return STRICT JSON for the provided schema, with keys 'en' and 'km'. For 'en', provide an English transcription or detailed summary covering all important content. For 'km', provide a Khmer transcription or detailed summary covering all important content. If you cannot produce a value for a language, set it to null.",
                      },
                    ]
                  : [
                      {
                        type: "text",
                        text: "You are an OCR & transcription agent for Khmer property documents. Return STRICT JSON for the provided schema, with keys 'en' and 'km'. For 'en', provide an English transcription or detailed summary covering all important content. For 'km', provide a Khmer transcription or detailed summary covering all important content. If you cannot produce a value for a language, set it to null.",
                      },
                      { type: "image_url", image_url: { url: dataUrl } },
                    ],
              },
            ],
          }),
        });

        console.log("==== response startOcrForTranscription ====", response);

        if (!response.ok) {
          const errText = await response.text();
          await ctx.runMutation(
            (internal as any).mutations.documents.updateFile,
            {
              id: d.fileId as any,
              fields: {
                ocrStatus: "transcription_failed",
                errorReason: errText.slice(0, 500),
              },
            } as any,
          );
          results.push({
            fileId: String(d.fileId),
            key: d.key,
            error: "openai_error",
          });
          continue;
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content ?? "{}";
        console.log("==== text startOcrForTranscription ====", text);
        let parsed: { en?: string | null; km?: string | null } = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = {};
        }

        en =
          typeof parsed.en === "string" && parsed.en.trim().length > 0
            ? parsed.en.trim()
            : undefined;
        km =
          typeof parsed.km === "string" && parsed.km.trim().length > 0
            ? parsed.km.trim()
            : undefined;

        // Persist transcription into encrypted envelope on document_files
        if (en || km) {
          const descriptions: Record<string, { text: string }> = {};
          if (en) descriptions.en = { text: en };
          if (km) descriptions.km = { text: km };

          await ctx.runAction(
            (api.actions as any).documentsEncrypted.upsertFilePayloadEncrypted,
            {
              orgId: resolvedOrgId as any,
              fileId: d.fileId as any,
              payload: {
                descriptions,
              },
            } as any,
          );
        }

        await ctx.runMutation(
          (internal as any).mutations.documents.updateFile,
          {
            id: d.fileId as any,
            fields: {
              ocrStatus: "transcription_done",
              errorReason: undefined,
            },
          } as any,
        );

        results.push({
          fileId: String(d.fileId),
          key: d.key,
          transcription: en || km ? { en, km } : undefined,
        });
      } catch (e: any) {
        await ctx.runMutation(
          (internal as any).mutations.documents.updateFile,
          {
            id: d.fileId as any,
            fields: {
              ocrStatus: "transcription_failed",
              errorReason: e?.message || "transcription_failed",
            },
          } as any,
        );
        results.push({
          fileId: String(d.fileId),
          key: d.key,
          error: "request_failed",
        });
      }
    }

    return { results };
  },
});

// ========= promoteAndCleanup (document_files staging -> permanent) =========

export const promoteAndCleanup = action({
  args: {
    orgId: v.union(v.id("orgs"), v.string()),
    documents: v.array(
      v.object({
        fileId: v.id("document_files"),
        stagingKey: v.string(),
        stagingVersionId: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const resolvedOrgId =
      typeof args.orgId === "string"
        ? await ctx.runQuery(
            (internal as any)["queries/identity"].getOrgByClerkId,
            { clerkOrgId: args.orgId },
          )
        : args.orgId;
    if (!resolvedOrgId) throw new Error("Organization not found or not linked");
    const membership = await ctx.runQuery(
      (internal as any)["queries/identity"].getMembershipForCurrentUser,
      { orgId: resolvedOrgId as any },
    );
    if (
      !membership ||
      !["owner", "admin", "editor"].includes((membership as any).role)
    ) {
      throw new Error("Forbidden");
    }

    const Bucket = process.env.S3_BUCKET_PRIVATE!;
    const s3 = s3Client;
    const log = appLogger.child({
      action: "s3_promote_documents",
      actor: identity.subject,
      orgId: String(resolvedOrgId),
    });

    for (const d of args.documents) {
      try {
        if (!/\/docs\/temporary\//.test(d.stagingKey)) {
          throw new Error("invalid_source_key_prefix");
        }

        const file = await ctx.runQuery(
          (internal as any).queries.documents.getFile,
          { id: d.fileId as any } as any,
        );
        if (!file) throw new Error("file_not_found");

        const doc = await ctx.runQuery(
          (internal as any).queries.documents.getDocument,
          { id: (file as any).documentId as any } as any,
        );
        if (!doc) throw new Error("doc_not_found");
        if (String(doc.orgId) !== String(resolvedOrgId)) {
          throw new Error("org_mismatch");
        }
        if (!isKeyInOrg(String(resolvedOrgId), d.stagingKey)) {
          throw new Error("staging_key_out_of_scope");
        }

        const expectedPathOk = isDocKeyFor(
          {
            orgId: String(resolvedOrgId),
            propertyId: String(doc.propertyId),
            docId: String((file as any).documentId),
            mode: "temporary",
          },
          d.stagingKey,
        );
        if (!expectedPathOk) throw new Error("staging_key_mismatch");

        const prodKey = d.stagingKey.replace(
          "/docs/temporary/",
          "/docs/permanent/",
        );
        const copySource = d.stagingVersionId
          ? `${Bucket}/${d.stagingKey}?versionId=${encodeURIComponent(
              d.stagingVersionId,
            )}`
          : `${Bucket}/${d.stagingKey}`;
        const kmsKeyId = process.env.S3_KMS_KEY_ID;
        const copy = new CopyObjectCommand({
          Bucket,
          Key: prodKey,
          CopySource: copySource,
          ServerSideEncryption: "aws:kms",
          ...(kmsKeyId ? { SSEKMSKeyId: kmsKeyId } : {}),
        });
        const copyRes = await s3.send(copy);
        const prodVersionId = (copyRes as any)?.VersionId || undefined;

        await ctx.runMutation(
          (internal as any).mutations.documents.updateFile,
          {
            id: d.fileId as any,
            fields: {
              s3Key: prodKey,
              s3VersionId: prodVersionId,
              ingestionStatus: "committed",
            },
          } as any,
        );

        try {
          log.info("promote_succeeded_document", {
            fileId: String(d.fileId),
            docId: String((file as any).documentId),
            fromKey: d.stagingKey,
            toKey: prodKey,
            prodVersionId,
          });
        } catch {}

        try {
          await s3.send(
            new DeleteObjectCommand({ Bucket, Key: d.stagingKey }),
          );
        } catch {}
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket,
              Key: `${d.stagingKey}.structured.json`,
            }),
          );
        } catch {}
      } catch (e: any) {
        await ctx.runMutation(
          (internal as any).mutations.documents.updateFile,
          {
            id: d.fileId as any,
            fields: {
              ocrStatus: "failed",
              errorReason: e?.message || "promote_failed",
            },
          } as any,
        );
        try {
          log.warn("promote_failed_document", {
            fileId: String(d.fileId),
            fromKey: d.stagingKey,
            error: e?.message,
          });
        } catch {}
      }
    }

    return { ok: true } as any;
  },
});

// ========= cleanupTemporaryDocument (delete temp S3 + file row) =========

export const cleanupTemporaryDocument = action({
  args: {
    orgId: v.union(v.id("orgs"), v.string()),
    fileId: v.id("document_files"),
    s3Key: v.string(),
  },
  handler: async (ctx, args) => {
    const Bucket = process.env.S3_BUCKET_PRIVATE!;
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });

    try {
      const orgPart =
        typeof args.orgId === "string"
          ? String(args.orgId)
          : String(args.orgId);
      // Optional: ensure key is within this org's prefix
      // if (!args.s3Key.includes(`/org/${orgPart}/`)) {
      //   return { ok: false, reason: "org_scope_mismatch" } as any;
      // }
      appLogger.info("cleanupTemporaryDocument_documents", {
        orgPart,
        key: args.s3Key,
      });
    } catch {}

    try {
      await s3.send(new DeleteObjectCommand({ Bucket, Key: args.s3Key }));
    } catch {}
    try {
      await s3.send(
        new DeleteObjectCommand({ Bucket, Key: `${args.s3Key}.structured.json` }),
      );
    } catch {}

    try {
      await ctx.runMutation(
        (internal as any).mutations.documents.updateFile,
        {
          id: args.fileId as any,
          fields: { ocrStatus: "failed", errorReason: "temp_cleanup" },
        } as any,
      );
      await ctx.runMutation(
        (internal as any).mutations.documents.deleteFile,
        { id: args.fileId as any } as any,
      );
    } catch {}

    return { ok: true } as any;
  },
});
