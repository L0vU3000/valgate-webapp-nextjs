import type { Certification } from "@/lib/data/types/certification";
import type { Inspection } from "@/lib/data/types/inspection";
import type { SafetyRisk } from "@/lib/data/types/safety-risk";

// Portfolio-level Compliance rollup. Complements the per-property Safety tab:
// this page unifies certifications, inspections and safety risks across every
// property the owner holds into one register with expiry / overdue tracking.

const MS_PER_DAY = 86_400_000;

export type ComplianceItemKind = "Certification" | "Inspection" | "Safety Risk";
export type ComplianceState = "ok" | "attention" | "overdue";

export type ComplianceRow = {
  id: string; // entity id (used as the action target for safety risks)
  kind: ComplianceItemKind;
  title: string;
  propertyId: string;
  propertyName: string;
  dateLabel: string; // e.g. "Expires 12 Jun 2025", "Inspected 3 Mar 2025"
  dateAt: number | null;
  overdueDays: number; // >0 when the item is past due / expired
  state: ComplianceState;
  statusLabel: string; // badge text
  // A safety risk that is still Open can be resolved inline from the register.
  // Certifications / inspections deep-link to the property Safety tab instead.
  resolvableRiskId: string | null;
};

export type ComplianceMonitorCard = {
  key: "certifications" | "inspections" | "safety-risks";
  label: string;
  value: string; // headline metric, e.g. "8 / 10 current"
  detail: string; // supporting line
  state: ComplianceState;
};

export type ComplianceSummary = {
  // Overall progress = share of tracked obligations currently in good standing.
  compliantPct: number; // 0–100
  trackedCount: number;
  okCount: number;
  attentionCount: number;
  overdueCount: number;
  headline: string;
  cards: ComplianceMonitorCard[];
  rows: ComplianceRow[];
};

type Input = {
  certifications: Certification[];
  inspections: Inspection[];
  risks: SafetyRisk[];
  propertyNames: Map<string, string>;
  now?: number;
};

function daysSince(from: number, now: number): number {
  return Math.max(0, Math.floor((now - from) / MS_PER_DAY));
}

function daysUntil(to: number, now: number): number {
  return Math.ceil((to - now) / MS_PER_DAY);
}

function nameFor(names: Map<string, string>, propertyId: string): string {
  return names.get(propertyId) ?? "Unknown property";
}

function certRow(cert: Certification, names: Map<string, string>, now: number): ComplianceRow {
  const expired = cert.status === "Expired" || cert.expiresAt < now;
  const overdueDays = expired ? daysSince(cert.expiresAt, now) : 0;
  let state: ComplianceState = "ok";
  if (expired) state = "overdue";
  else if (cert.status === "Expiring") state = "attention";
  const untilDays = daysUntil(cert.expiresAt, now);
  const dateLabel = expired
    ? `Expired ${overdueDays}d ago`
    : `Expires in ${Math.max(0, untilDays)}d`;
  return {
    id: cert.id,
    kind: "Certification",
    title: cert.name,
    propertyId: cert.propertyId,
    propertyName: nameFor(names, cert.propertyId),
    dateLabel,
    dateAt: cert.expiresAt,
    overdueDays,
    state,
    statusLabel: expired ? "Expired" : cert.status,
    resolvableRiskId: null,
  };
}

function inspectionRow(insp: Inspection, names: Map<string, string>, now: number): ComplianceRow {
  const failed = insp.status === "Failed";
  const hasIssues = insp.issues > 0;
  let state: ComplianceState = "ok";
  if (failed) state = "overdue";
  else if (hasIssues || insp.status === "Satisfactory") state = "attention";
  return {
    id: insp.id,
    kind: "Inspection",
    title: insp.type,
    propertyId: insp.propertyId,
    propertyName: nameFor(names, insp.propertyId),
    dateLabel: `Inspected ${daysSince(insp.inspectedAt, now)}d ago`,
    dateAt: insp.inspectedAt,
    overdueDays: 0,
    state,
    statusLabel: hasIssues ? `${insp.status} · ${insp.issues} issue${insp.issues === 1 ? "" : "s"}` : insp.status,
    resolvableRiskId: null,
  };
}

function riskRow(risk: SafetyRisk, names: Map<string, string>, now: number): ComplianceRow {
  const open = risk.status === "Open";
  const critical = risk.severity === "Critical" || risk.severity === "High";
  let state: ComplianceState = "ok";
  if (open && critical) state = "overdue";
  else if (open) state = "attention";
  return {
    id: risk.id,
    kind: "Safety Risk",
    title: risk.title,
    propertyId: risk.propertyId,
    propertyName: nameFor(names, risk.propertyId),
    dateLabel: open ? `Open ${daysSince(risk.createdAt, now)}d` : "Resolved",
    dateAt: risk.createdAt,
    overdueDays: 0,
    state,
    statusLabel: open ? `${risk.severity} · Open` : "Resolved",
    resolvableRiskId: open ? risk.id : null,
  };
}

const STATE_ORDER: Record<ComplianceState, number> = { overdue: 0, attention: 1, ok: 2 };

export function buildComplianceSummary(input: Input): ComplianceSummary {
  const now = input.now ?? Date.now();
  const { certifications, inspections, risks, propertyNames } = input;

  const rows: ComplianceRow[] = [
    ...certifications.map((c) => certRow(c, propertyNames, now)),
    ...inspections.map((i) => inspectionRow(i, propertyNames, now)),
    ...risks.map((r) => riskRow(r, propertyNames, now)),
  ];

  // Register order: worst state first, then most overdue, then newest.
  rows.sort((a, b) => {
    if (STATE_ORDER[a.state] !== STATE_ORDER[b.state])
      return STATE_ORDER[a.state] - STATE_ORDER[b.state];
    if (a.overdueDays !== b.overdueDays) return b.overdueDays - a.overdueDays;
    return (b.dateAt ?? 0) - (a.dateAt ?? 0);
  });

  const trackedCount = rows.length;
  const okCount = rows.filter((r) => r.state === "ok").length;
  const attentionCount = rows.filter((r) => r.state === "attention").length;
  const overdueCount = rows.filter((r) => r.state === "overdue").length;
  const compliantPct =
    trackedCount > 0 ? Math.round((okCount / trackedCount) * 100) : 100;

  // Monitoring cards — one per obligation family.
  const currentCerts = certifications.filter((c) => c.status !== "Expired" && c.expiresAt >= now).length;
  const certState: ComplianceState =
    certifications.some((c) => c.status === "Expired" || c.expiresAt < now)
      ? "overdue"
      : certifications.some((c) => c.status === "Expiring")
        ? "attention"
        : "ok";

  const failedInspections = inspections.filter((i) => i.status === "Failed").length;
  const openIssues = inspections.reduce((sum, i) => sum + i.issues, 0);
  const inspState: ComplianceState =
    failedInspections > 0 ? "overdue" : openIssues > 0 ? "attention" : "ok";

  const openRisks = risks.filter((r) => r.status === "Open");
  const criticalRisks = openRisks.filter(
    (r) => r.severity === "Critical" || r.severity === "High",
  ).length;
  const riskState: ComplianceState =
    criticalRisks > 0 ? "overdue" : openRisks.length > 0 ? "attention" : "ok";

  const cards: ComplianceMonitorCard[] = [
    {
      key: "certifications",
      label: "Certifications",
      value: certifications.length > 0 ? `${currentCerts} / ${certifications.length} current` : "None on file",
      detail:
        certState === "overdue"
          ? "Expired certificate needs renewal"
          : certState === "attention"
            ? "Renewal coming up"
            : "All certificates current",
      state: certState,
    },
    {
      key: "inspections",
      label: "Inspections",
      value: inspections.length > 0 ? `${inspections.length} on record` : "None on file",
      detail:
        failedInspections > 0
          ? `${failedInspections} failed inspection${failedInspections === 1 ? "" : "s"}`
          : openIssues > 0
            ? `${openIssues} open issue${openIssues === 1 ? "" : "s"}`
            : "No open issues",
      state: inspState,
    },
    {
      key: "safety-risks",
      label: "Safety risks",
      value: `${openRisks.length} open`,
      detail:
        criticalRisks > 0
          ? `${criticalRisks} high-severity`
          : openRisks.length > 0
            ? "Lower-severity risks open"
            : "No open risks",
      state: riskState,
    },
  ];

  const headline =
    overdueCount > 0
      ? `${overdueCount} obligation${overdueCount === 1 ? "" : "s"} need${overdueCount === 1 ? "s" : ""} urgent attention`
      : attentionCount > 0
        ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} to review soon`
        : trackedCount > 0
          ? "Every obligation is up to date"
          : "Add certificates and inspections to track compliance";

  return {
    compliantPct,
    trackedCount,
    okCount,
    attentionCount,
    overdueCount,
    headline,
    cards,
    rows,
  };
}
