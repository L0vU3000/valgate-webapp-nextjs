import type { Property } from "@/lib/data/types/property";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { CoOwner } from "@/lib/data/types/co-owner";
import type { OwnershipDocument } from "@/lib/data/types/ownership-document";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { SafetyRisk } from "@/lib/data/types/safety-risk";
import type { Inspection } from "@/lib/data/types/inspection";
import type { Certification } from "@/lib/data/types/certification";
import type { EmergencyContact } from "@/lib/data/types/emergency-contact";
import type { EstateAssignment } from "@/lib/data/types/successor-property-assignment";
import type { Document } from "@/lib/data/types/document";
import type { PillarVerification, Pillar } from "@/lib/data/types/pillar-verification";
import type { ProgressCheck, ProgressPillar, ProgressDetails } from "@/lib/data/types/progress";

export type ProgressContext = {
  leases: Lease[];
  tenants: Tenant[];
  payments: Payment[];
  ownershipRecords: OwnershipRecord[];
  coOwners: CoOwner[];
  ownershipDocuments: OwnershipDocument[];
  valuations: PropertyValuation[];
  safetyRisks: SafetyRisk[];
  inspections: Inspection[];
  certifications: Certification[];
  emergencyContacts: EmergencyContact[];
  successorAssignments: EstateAssignment[];
  documents: Document[];
  verifications?: PillarVerification[];
};

function scorePillar(checks: ProgressCheck[]): number {
  if (checks.length === 0) return 0;
  return Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
}

/**
 * Returns the full pillar-by-pillar breakdown plus overall score.
 * Use this when you need to render the progress modal.
 *
 * Pillars and weights:
 *   Location & Identity  15%
 *   Financials           30%   (includes Valuation History)
 *   Rental               20%
 *   Ownership            15%
 *   Safety               10%
 *   Estate Planning       5%
 *   Documents             5%
 */
export function computeProgressDetails(p: Property, ctx: ProgressContext): ProgressDetails {
  const pid = p.id;

  const leases             = ctx.leases.filter((l) => l.propertyId === pid);
  const tenants            = ctx.tenants.filter((t) => t.propertyId === pid);
  const leaseIds           = new Set(leases.map((l) => l.id));
  const payments           = ctx.payments.filter((pay) => pay.leaseId != null && leaseIds.has(pay.leaseId));
  const ownershipRecords   = ctx.ownershipRecords.filter((o) => o.propertyId === pid);
  const coOwners           = ctx.coOwners.filter((c) => c.propertyId === pid);
  const ownershipDocuments = ctx.ownershipDocuments.filter((d) => d.propertyId === pid);
  const valuations         = ctx.valuations.filter((v) => v.propertyId === pid);
  const successorAssign    = ctx.successorAssignments.filter((s) => s.propertyId === pid);
  const documents          = ctx.documents.filter((d) => d.propertyId === pid);

  const safetyRisks      = ctx.safetyRisks.filter((r) => r.propertyId === pid);
  const inspections      = ctx.inspections.filter((i) => i.propertyId === pid);
  const certifications   = ctx.certifications.filter((c) => c.propertyId === pid);
  const emergencyContacts = ctx.emergencyContacts.filter((e) => e.propertyId === pid);

  const verifiedPillars = new Set(
    (ctx.verifications ?? []).filter((v) => v.propertyId === pid && v.status === "verified").map((v) => v.pillar),
  );

  const rawPillars: Omit<ProgressPillar, "score" | "contribution">[] = [
    {
      key: "location",
      name: "Location & Identity",
      weight: 15,
      href: `/property/${pid}/location`,
      checks: [
        { label: "Address filled", done: !!p.addressLine?.trim() },
        { label: "City filled", done: !!p.city?.trim() },
        { label: "Coordinates set", done: p.lat !== 0 || p.lng !== 0 },
        { label: "Title type set", done: p.title !== "—" },
      ],
    },
    {
      key: "financials",
      name: "Financials",
      weight: 30,
      href: `/property/${pid}/financials`,
      checks: [
        { label: "Purchase price set", done: p.buyNumeric > 0 },
        { label: "Purchase date set", done: !!p.purchaseDate },
        { label: "Market value recorded", done: !!p.currentMarketValue && p.currentMarketValue > 0 },
        { label: "Mortgage / debt recorded", done: p.outstandingMortgage !== undefined },
        { label: "Annual property tax", done: !!p.annualPropertyTax && p.annualPropertyTax > 0 },
        { label: "Annual insurance", done: !!p.annualInsurance && p.annualInsurance > 0 },
        { label: "Valuation on file", done: valuations.length > 0 },
        { label: "6+ months of history", done: valuations.length >= 6 },
      ],
    },
    {
      key: "rental",
      name: "Rental",
      weight: 20,
      href: `/property/${pid}/rental`,
      checks: (p.propertyUse ?? "investment") === "investment"
        ? [
            { label: "Active lease exists", done: leases.some((l) => l.stage === "Signed") },
            { label: "Tenant on file", done: tenants.length > 0 },
            { label: "Payment record exists", done: payments.length > 0 },
          ]
        : [
            { label: "Not applicable (non-investment property)", done: true },
          ],
    },
    {
      key: "ownership",
      name: "Ownership",
      weight: 15,
      href: `/property/${pid}/ownership`,
      checks: [
        { label: "Ownership structure recorded", done: ownershipRecords.length > 0 },
        { label: "Co-owner on file", done: coOwners.length > 0 },
        { label: "Deed document uploaded", done: ownershipDocuments.length > 0 },
      ],
    },
    {
      key: "safety",
      name: "Safety",
      weight: 10,
      href: `/property/${pid}/safety`,
      checks: [
        { label: "Inspection on file", done: inspections.length > 0 },
        { label: "No expired certifications", done: certifications.length > 0 && certifications.every((c) => c.status !== "Expired") },
        { label: "Emergency contact added", done: emergencyContacts.length > 0 },
        { label: "No high/critical open risks", done: !safetyRisks.some((r) => r.severity === "Critical" || r.severity === "High") },
      ],
    },
    {
      key: "estate",
      name: "Estate Planning",
      weight: 5,
      href: `/estate-planning`,
      checks: [
        { label: "Beneficiary assigned", done: successorAssign.length > 0 },
        { label: "Estate plan verified", done: p.estateVerified === true },
      ],
    },
    {
      key: "documents",
      name: "Documents",
      weight: 5,
      href: `/property/${pid}/documents`,
      checks: [
        { label: "At least one document uploaded", done: documents.length > 0 },
      ],
    },
  ];

  const pillars: ProgressPillar[] = rawPillars.map((pillar) => {
    const score = scorePillar(pillar.checks);
    return { ...pillar, score, contribution: Math.round(score * pillar.weight / 100), verified: verifiedPillars.has(pillar.key as Pillar) };
  });

  const totalScore = Math.round(
    pillars.reduce((sum, p) => sum + (p.score / 100) * p.weight, 0)
  );

  return { score: totalScore, pillars };
}

export function computeProgress(p: Property, ctx: ProgressContext): number {
  return computeProgressDetails(p, ctx).score;
}
