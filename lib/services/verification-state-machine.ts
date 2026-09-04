import { VerificationStatusSchema, type VerificationStatus } from "@/lib/data/types/pillar-verification";

export const VerificationActionSchema = [
  "submit",
  "approve",
  "reject",
  "revoke",
] as const;
export type VerificationAction = (typeof VerificationActionSchema)[number];

const transitions: Record<VerificationAction, Record<VerificationStatus, VerificationStatus | null>> = {
  submit: {
    unverified: "verified",
    rejected: "verified",
    revoked: "verified",
    pending_review: null,
    verified: null,
  },
  approve: {
    unverified: null,
    rejected: null,
    revoked: null,
    pending_review: "verified",
    verified: null,
  },
  reject: {
    unverified: null,
    rejected: null,
    revoked: null,
    pending_review: "rejected",
    verified: "rejected",
  },
  revoke: {
    unverified: null,
    rejected: null,
    revoked: null,
    pending_review: null,
    verified: "revoked",
  },
};

export function nextStatus(
  current: VerificationStatus,
  action: VerificationAction,
): VerificationStatus {
  const next = transitions[action][current];
  if (!next) throw new Error("illegal transition");
  return VerificationStatusSchema.parse(next);
}

export function canTransition(current: VerificationStatus, action: VerificationAction): boolean {
  return transitions[action][current] !== null;
}
