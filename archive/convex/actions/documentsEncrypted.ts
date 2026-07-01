"use node";

import { TextDecoder, TextEncoder } from "util";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { decryptEnvelope } from "../crypto/kms";
import type { Envelope } from "../crypto/kms";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

const roleOrder = ["viewer", "editor", "admin", "owner"] as const;
type Role = (typeof roleOrder)[number];

function assertRole(membership: any, min: Role) {
  if (!membership || membership.status !== "active") throw new Error("forbidden");
  const idx = roleOrder.indexOf(membership.role as Role);
  const need = roleOrder.indexOf(min);
  if (idx < 0 || idx < need) throw new Error("forbidden");
}

// ===== Payload definitions for encrypted document_files content =====

export const descriptionVariantValidator = v.object({
  text: v.string(),
  script: v.optional(v.string()),
  note: v.optional(v.string()),
});

export const multiLangDescriptionsValidator = v.record(v.string(), descriptionVariantValidator);

export const documentFilePayloadV1Validator = v.object({
  descriptions: v.optional(multiLangDescriptionsValidator),
});

export type DescriptionVariant = {
  text: string;
  script?: string;
  note?: string;
};

export type MultiLangDescriptions = Record<string, DescriptionVariant>;

export type DocumentFilePayloadV1 = {
  descriptions?: MultiLangDescriptions;
};

function buildPayload(input: DocumentFilePayloadV1): DocumentFilePayloadV1 {
  const cleaned: DocumentFilePayloadV1 = {};
  if (input.descriptions) {
    const nonEmpty: MultiLangDescriptions = {};
    for (const [lang, variant] of Object.entries(input.descriptions)) {
      if (!variant || typeof variant.text !== "string") continue;
      const trimmed = variant.text.trim();
      if (trimmed.length === 0) continue;
      nonEmpty[lang] = { ...variant, text: trimmed };
    }
    if (Object.keys(nonEmpty).length > 0) {
      cleaned.descriptions = nonEmpty;
    }
  }
  return cleaned;
}

async function decryptDocumentFilePayload(params: {
  orgId: Id<"orgs">;
  fileId: Id<"document_files">;
  row: any;
}): Promise<{ payload: DocumentFilePayloadV1; payloadV: number; legacy: boolean }> {
  const { orgId, fileId, row } = params;
  if (row.ciphertextB64 && row.dekCiphertextB64) {
    try {
      const payloadVersion = row.payloadV ?? 1;
      const bytes = await decryptEnvelope({
        envelope: {
          algo: row.algo,
          ivB64: row.ivB64,
          aadV: row.aadV,
          dekCiphertextB64: row.dekCiphertextB64,
          ciphertextB64: row.ciphertextB64,
        },
        aad: {
          v: payloadVersion,
          table: "document_files",
          orgId: String(orgId),
          rowId: String(fileId),
        },
      });
      const parsed = JSON.parse(decoder.decode(bytes)) as DocumentFilePayloadV1;
      return {
        payload: buildPayload(parsed),
        payloadV: payloadVersion,
        legacy: false,
      };
    } catch {
      // fall through to legacy behaviour
    }
  }

  // Legacy shape: we have no encrypted payload yet.
  return {
    payload: {},
    payloadV: row.payloadV ?? 0,
    legacy: true,
  };
}

// ===== Actions =====

type FileEnvelopeResult = { fileId: Id<"document_files"> };

export const upsertFilePayloadEncrypted = action({
  args: {
    orgId: v.id("orgs"),
    fileId: v.id("document_files"),
    payload: documentFilePayloadV1Validator,
  },
  returns: v.object({ fileId: v.id("document_files") }),
  handler: async (ctx, { orgId, fileId, payload }): Promise<FileEnvelopeResult> => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, {
      orgId,
    } as any);
    assertRole(membership, "editor");

    const existing = await ctx.runQuery((api as any).queries.documentsEncrypted.getFileEnvelope, {
      fileId,
    } as any);
    if (!existing || String(existing.orgId) !== String(orgId)) {
      throw new Error("document_file_not_found");
    }

    const payloadV = 1;
    const cleaned = buildPayload(payload as DocumentFilePayloadV1);
    const aad = {
      v: payloadV,
      table: "document_files",
      orgId: String(orgId),
      rowId: String(fileId),
    };

    const plaintext = JSON.stringify(cleaned);
    const envelope: Envelope = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
      aad,
      plaintext,
    } as any);

    const result: FileEnvelopeResult = await ctx.runMutation((api.mutations as any).documentsEncrypted.applyDocumentFileEnvelope, {
      fileId,
      orgId,
      payloadV,
      envelope,
    } as any);

    return result as any;
  },
});

export const getDecryptedFilePayload = action({
  args: {
    orgId: v.id("orgs"),
    fileId: v.id("document_files"),
  },
  returns: v.object({
    fileId: v.id("document_files"),
    payloadV: v.number(),
    payload: documentFilePayloadV1Validator,
    legacy: v.boolean(),
  }),
  handler: async (ctx, { orgId, fileId }) => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, {
      orgId,
    } as any);
    assertRole(membership, "viewer");

    const row: any = await ctx.runQuery((api as any).queries.documentsEncrypted.getFileEnvelope, {
      fileId,
    } as any);
    if (!row || String(row.orgId) !== String(orgId)) {
      throw new Error("document_file_not_found");
    }

    const decrypted = await decryptDocumentFilePayload({
      orgId,
      fileId: fileId as Id<"document_files">,
      row,
    });

    return {
      fileId,
      payloadV: decrypted.payloadV,
      payload: decrypted.payload,
      legacy: decrypted.legacy,
    };
  },
});

