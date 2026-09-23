import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { OwnershipHistory } from "@/lib/data/types/ownership-history";
import type { CoOwner } from "@/lib/data/types/co-owner";

// Ownership public DTOs for HTTP API v1. Deliberately NOT in lib/api/v1/dto.ts: that file is
// owned by the adjacent valuation slice (concurrent worktree), so the ownership slice keeps its
// DTOs here and reports the split. Same standing rule as dto.ts — hand-written field lists,
// never `...row`, no internal ids, no *Verified* flags, no evidence-doc id arrays, no financial
// internals. Withheld fields (docs/API-PARITY-PLAN.md §4):
//
//   OwnershipRecord — loanType, loanAmount, loanTermYears, interestRate, originationDate,
//     maturityDate, nextPaymentDue, lenderName, downPayment, closingCosts (loan/lender/interest
//     financial internals, withheld pending a product decision), verified + verifiedAt +
//     evidenceDocIds (*Verified* rule / evidence-doc id arrays), createdAt, updatedAt.
//   CoOwner — ssnMasked, tax1099Status (PII / tax internals, no off-web UI precedent), address
//     (PII, not in the approved public subset).
//   OwnershipHistory — eventDate (not in the approved public subset; text + color carry the
//     display data the client renders).

export type OwnershipRecordDtoV1 = {
  id: string;
  propertyId: string;
  holdingType: OwnershipRecord["holdingType"];
  distributionMethod: OwnershipRecord["distributionMethod"];
};

// Maps an OwnershipRecord to its public subset. Loan/lender/interest/acquisition-cost fields,
// verification flags, and evidence-doc ids stay off this object even when the row carries them.
export function toOwnershipRecordDto(record: OwnershipRecord): OwnershipRecordDtoV1 {
  return {
    id: record.id,
    propertyId: record.propertyId,
    holdingType: record.holdingType,
    distributionMethod: record.distributionMethod,
  };
}

export type OwnershipHistoryDtoV1 = {
  id: string;
  propertyId: string;
  text: string;
  color: string;
};

// Maps an OwnershipHistory row to its public subset. eventDate and the audit timestamps are
// deliberately omitted.
export function toOwnershipHistoryDto(entry: OwnershipHistory): OwnershipHistoryDtoV1 {
  return {
    id: entry.id,
    propertyId: entry.propertyId,
    text: entry.text,
    color: entry.color,
  };
}

export type CoOwnerDtoV1 = {
  id: string;
  propertyId: string;
  name: string;
  role: CoOwner["role"];
  sharePercent: number;
  email: string | undefined;
  phone: string | undefined;
};

// Maps a CoOwner row to its public subset. ssnMasked, tax1099Status, and address stay off this
// object even when the row carries them.
export function toCoOwnerDto(coOwner: CoOwner): CoOwnerDtoV1 {
  return {
    id: coOwner.id,
    propertyId: coOwner.propertyId,
    name: coOwner.name,
    role: coOwner.role,
    sharePercent: coOwner.sharePercent,
    email: coOwner.email,
    phone: coOwner.phone,
  };
}
