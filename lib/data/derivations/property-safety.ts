import type { Certification } from "@/lib/data/types/certification";
import type { SafetyRisk } from "@/lib/data/types/safety-risk";

export type ComplianceLevel = "compliant" | "attention" | "at-risk";

export type PropertySafetySummary = {
  /** Share of certificates that are not expired (0–100), null when none on file */
  certCurrentPct: number | null;
  certCurrentLabel: string;
  /** Share with status Valid specifically */
  certValidPct: number | null;
  complianceLevel: ComplianceLevel;
  complianceLabel: string;
  complianceDetail: string;
  /** Days until the nearest certificate expiry among non-expired certs */
  nextDueDays: number | null;
  nextDueName: string | null;
  nextDueAt: number | null;
  openIssueCount: number;
  issueBreakdown: string;
  headerSubtitle: string;
};

type Input = {
  certifications: Certification[];
  risks: SafetyRisk[];
  now?: number;
};

const MS_PER_DAY = 86_400_000;

function daysBetween(from: number, to: number): number {
  return Math.max(0, Math.ceil((to - from) / MS_PER_DAY));
}

function formatIssueBreakdown(risks: SafetyRisk[]): string {
  if (risks.length === 0) return "None open";
  const counts = new Map<string, number>();
  for (const r of risks) {
    const key = r.severity.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const order = ["critical", "high", "medium", "low"];
  const parts = order
    .filter((k) => counts.has(k))
    .map((k) => `${counts.get(k)} ${k}`);
  return parts.join(" · ");
}

function deriveCompliance(
  certifications: Certification[],
  risks: SafetyRisk[],
): Pick<PropertySafetySummary, "complianceLevel" | "complianceLabel" | "complianceDetail"> {
  const hasExpired = certifications.some((c) => c.status === "Expired");
  const hasExpiring = certifications.some((c) => c.status === "Expiring");
  const hasCriticalHigh = risks.some(
    (r) => r.severity === "Critical" || r.severity === "High",
  );
  const hasMedium = risks.some((r) => r.severity === "Medium");

  if (hasExpired || hasCriticalHigh) {
    const detail = hasExpired
      ? "Expired certificate on file"
      : "High-severity risk needs review";
    return {
      complianceLevel: "at-risk",
      complianceLabel: "At risk",
      complianceDetail: detail,
    };
  }

  if (hasExpiring || hasMedium || risks.length > 0) {
    const parts: string[] = [];
    if (hasExpiring) parts.push("Certificate expiring soon");
    if (hasMedium) parts.push("Medium-severity risk open");
    else if (risks.length > 0) parts.push(`${risks.length} open ${risks.length === 1 ? "issue" : "issues"}`);
    return {
      complianceLevel: "attention",
      complianceLabel: "Needs attention",
      complianceDetail: parts.join(" · ") || "Review open items",
    };
  }

  if (certifications.length === 0) {
    return {
      complianceLevel: "attention",
      complianceLabel: "Incomplete",
      complianceDetail: "No certificates on file",
    };
  }

  return {
    complianceLevel: "compliant",
    complianceLabel: "Compliant",
    complianceDetail: "All obligations met",
  };
}

function deriveNextDue(
  certifications: Certification[],
  now: number,
): Pick<PropertySafetySummary, "nextDueDays" | "nextDueName" | "nextDueAt"> {
  const upcoming = certifications
    .filter((c) => c.status !== "Expired")
    .map((c) => ({ name: c.name, at: c.expiresAt }))
    .filter((c) => c.at > now)
    .sort((a, b) => a.at - b.at);

  const nearest = upcoming[0];
  if (!nearest) {
    return { nextDueDays: null, nextDueName: null, nextDueAt: null };
  }

  return {
    nextDueDays: daysBetween(now, nearest.at),
    nextDueName: nearest.name,
    nextDueAt: nearest.at,
  };
}

export function buildPropertySafetySummary(input: Input): PropertySafetySummary {
  const { certifications, risks } = input;
  const now = input.now ?? Date.now();

  const totalCerts = certifications.length;
  const currentCerts = certifications.filter((c) => c.status !== "Expired").length;
  const validCerts = certifications.filter((c) => c.status === "Valid").length;

  const certCurrentPct =
    totalCerts > 0 ? Math.round((currentCerts / totalCerts) * 1000) / 10 : null;
  const certValidPct =
    totalCerts > 0 ? Math.round((validCerts / totalCerts) * 1000) / 10 : null;

  const certCurrentLabel =
    totalCerts > 0 ? `${currentCerts} of ${totalCerts} current` : "None on file";

  const compliance = deriveCompliance(certifications, risks);
  const nextDue = deriveNextDue(certifications, now);
  const openIssueCount = risks.length;
  const issueBreakdown = formatIssueBreakdown(risks);

  const headerParts: string[] = [];
  if (certCurrentPct != null) {
    headerParts.push(`${certCurrentPct}% certificates current`);
  }
  if (nextDue.nextDueDays != null && nextDue.nextDueName) {
    headerParts.push(
      `Next renewal in ${nextDue.nextDueDays} day${nextDue.nextDueDays === 1 ? "" : "s"}`,
    );
  } else if (certifications.length === 0) {
    headerParts.push("Add certificates to track compliance");
  }

  return {
    certCurrentPct,
    certCurrentLabel,
    certValidPct,
    ...compliance,
    ...nextDue,
    openIssueCount,
    issueBreakdown,
    headerSubtitle: headerParts.join(" · ") || compliance.complianceDetail,
  };
}
