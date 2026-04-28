"use node";

import { createHmac } from "node:crypto";
import { Logger } from "@/lib/utils/logger";

export type OwnerSearchField =
  | "displayName"
  | "email"
  | "phone"
  | "nationalId"
  | "registrationNumber";

let cachedSecret: string | null = null;

function resolveSecret(): string {
  if (cachedSecret) return cachedSecret;
  const envSecret =
    process.env.OWNER_SEARCH_HASH_SECRET ||
    process.env.CONVEX_SEARCH_HASH_SECRET ||
    process.env.CONVEX_HASH_SECRET;
  if (envSecret && envSecret.trim().length > 0) {
    cachedSecret = envSecret.trim();
    return cachedSecret;
  }
  const devSecret = "dev-owner-search-secret";
  Logger.warn("Owner search hash secret missing; using ephemeral dev secret");
  cachedSecret = devSecret;
  return cachedSecret;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function canonicalizeDefault(value: string): string {
  return collapseWhitespace(value).toLowerCase();
}

function canonicalizeEmail(value: string): string {
  return canonicalizeDefault(value);
}

function canonicalizePhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : digits.replace(/^0+/, "");
}

function canonicalizeIdentifier(value: string): string {
  return collapseWhitespace(value).toUpperCase();
}

export function canonicalizeSearchValue(field: OwnerSearchField, raw: string): string {
  if (!raw) return "";
  switch (field) {
    case "displayName":
      return canonicalizeDefault(raw);
    case "email":
      return canonicalizeEmail(raw);
    case "phone":
      return canonicalizePhone(raw);
    case "nationalId":
    case "registrationNumber":
      return canonicalizeIdentifier(raw);
    default:
      return canonicalizeDefault(raw);
  }
}

export function computeOwnerSearchHash(params: {
  orgId: string;
  field: OwnerSearchField;
  value: string;
}): string {
  const canonical = canonicalizeSearchValue(params.field, params.value);
  if (!canonical) return "";
  const secret = resolveSecret();
  const key = `${secret}:${params.orgId}`;
  const hmac = createHmac("sha256", key);
  hmac.update(`${params.field}:${canonical}`);
  return hmac.digest("hex");
}


