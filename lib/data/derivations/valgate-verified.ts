import type { Property } from "@/lib/data/types/property";
import type { PillarVerification, Pillar } from "@/lib/data/types/pillar-verification";

const REQUIRED_BASE: Pillar[] = ["location", "financials", "ownership"];
const REQUIRED_INVESTMENT: Pillar[] = ["location", "financials", "ownership", "rental", "safety"];
const SIGNALS: Pillar[] = ["valuation", "estate", "documents"];

export type ValgateVerifiedResult = {
  verified: boolean;
  missing: Pillar[];
  signals: { pillar: Pillar; verified: boolean }[];
};

export function computeValgateVerified(property: Property, verifications: PillarVerification[]): ValgateVerifiedResult {
  const required = property.propertyUse === "investment" ? REQUIRED_INVESTMENT : REQUIRED_BASE;
  const verifiedSet = new Set(verifications.filter((v) => v.status === "verified").map((v) => v.pillar));
  const missing = required.filter((p) => !verifiedSet.has(p));
  return {
    verified: missing.length === 0,
    missing,
    signals: SIGNALS.map((p) => ({ pillar: p, verified: verifiedSet.has(p) })),
  };
}
