import "server-only";
import * as db from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import { formatBytes } from "@/lib/format";

export type PropertyStatus = "complete" | "pending" | "action" | "draft";

export type EstateStat = {
  label: string;
  value: string;
  sub: string | null;
  subVariant?: "danger" | "neutral" | "primary";
  progress: number | null;
  accent: boolean;
};

export type SuccessorRole = "primary" | "contingent";

export type Successor = {
  id: string;
  initials: string;
  name: string;
  relation: string;
  role: SuccessorRole;
  share: string;
  verified: boolean;
  propertyIds: string[];
};

export type EstateDocument = {
  id: string;
  propertyId: string;
  name: string;
  meta: string;
  iconBg: string;
};

export type TimelineItem = {
  id: string;
  title: string;
  time: string;
  desc: string;
  active: boolean;
  propertyId?: string;
};

export type EstateProperty = {
  id: string;
  name: string;
  address: string;
  status: PropertyStatus;
  initials: string;
  color: string;
  completionPct: number;
  lastUpdatedLabel: string;
};

export type EstatePlanningPageData = {
  stats: EstateStat[];
  properties: EstateProperty[];
  successors: Successor[];
  documents: EstateDocument[];
  timeline: TimelineItem[];
};

const COLOR_SWATCHES = ["#d8e3f4", "#e5f3eb", "#fef3c7", "#fee2e2", "#e9d5ff", "#c7f9ff"];

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return `Today, ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return formatDate(ts);
}

function deriveStatus(completionPct: number): PropertyStatus {
  if (completionPct >= 100) return "complete";
  if (completionPct >= 60) return "pending";
  if (completionPct >= 30) return "action";
  return "draft";
}

function buildAddress(property: Awaited<ReturnType<typeof db.properties.list>>[number]): string {
  const parts = [property.addressLine, property.city, property.province].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return property.province || "Address unavailable";
}

function estateDocumentMeta(
  doc: Awaited<ReturnType<typeof db.documents.list>>[number],
): string {
  const ext = doc.extension ? doc.extension.toUpperCase() : "FILE";
  const size = typeof doc.sizeBytes === "number" ? formatBytes(doc.sizeBytes) : "Unknown size";
  return `${formatDate(doc.uploadedAt)} • ${ext} • ${size}`;
}

export async function getEstatePlanningPageData(): Promise<EstatePlanningPageData> {
  const userId = getCurrentUserId();
  const [propertiesRaw, successorsRaw, documentsRaw, assignmentsRaw, activityRaw] =
    await Promise.all([
      db.properties.list(userId),
      db.successors.list(userId),
      db.documents.list(userId),
      db.successorPropertyAssignments.list(userId),
      db.estateActivityEvents.list(userId),
    ]);

  const properties = propertiesRaw
    .filter((property) => !property.isArchived && property.status !== "Sold" && property.status !== "Archived")
    .sort((a, b) => a.name.localeCompare(b.name));

  const fallbackPropertyId = properties[0]?.id;
  const effectiveAssignments =
    assignmentsRaw.length > 0 || !fallbackPropertyId
      ? assignmentsRaw
      : successorsRaw.map((successor, index) => ({
          id: `fallback-${successor.id}-${index}`,
          userId,
          successorId: successor.id,
          propertyId: fallbackPropertyId,
          createdAt: successor.createdAt,
          updatedAt: successor.updatedAt,
        }));

  const successorById = new Map(successorsRaw.map((successor) => [successor.id, successor]));
  const assignmentsByProperty = new Map<string, string[]>();
  const assignmentsBySuccessor = new Map<string, string[]>();
  for (const assignment of effectiveAssignments) {
    const propertyIds = assignmentsBySuccessor.get(assignment.successorId) ?? [];
    propertyIds.push(assignment.propertyId);
    assignmentsBySuccessor.set(assignment.successorId, propertyIds);

    const successorIds = assignmentsByProperty.get(assignment.propertyId) ?? [];
    successorIds.push(assignment.successorId);
    assignmentsByProperty.set(assignment.propertyId, successorIds);
  }

  const estateDocsRaw = documentsRaw.filter(
    (doc) => doc.kind === "document" && (doc.category ?? "").toLowerCase() === "estate",
  );
  const estateDocsByProperty = new Map<string, typeof estateDocsRaw>();
  for (const doc of estateDocsRaw) {
    const docs = estateDocsByProperty.get(doc.propertyId) ?? [];
    docs.push(doc);
    estateDocsByProperty.set(doc.propertyId, docs);
  }

  const activityByProperty = new Map<string, typeof activityRaw>();
  for (const event of activityRaw) {
    if (!event.propertyId) continue;
    const events = activityByProperty.get(event.propertyId) ?? [];
    events.push(event);
    activityByProperty.set(event.propertyId, events);
  }

  const propertyMetrics = properties.map((property) => {
    const assignedSuccessorIds = assignmentsByProperty.get(property.id) ?? [];
    const assignedSuccessors = assignedSuccessorIds
      .map((id) => successorById.get(id))
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
    const primaryShareTotal = assignedSuccessors
      .filter((successor) => successor.role === "primary")
      .reduce((sum, successor) => sum + successor.share, 0);
    const hasAssignedSuccessor = assignedSuccessors.length > 0;
    const hasPrimaryShareBalance =
      hasAssignedSuccessor && Math.abs(primaryShareTotal - 100) < 0.001;
    const hasEstateDoc = (estateDocsByProperty.get(property.id) ?? []).length > 0;
    const hasActivity = (activityByProperty.get(property.id) ?? []).length > 0;

    const checks = [hasAssignedSuccessor, hasPrimaryShareBalance, hasEstateDoc, hasActivity];
    const passed = checks.filter(Boolean).length;
    const completionPct = Math.round((passed / checks.length) * 1000) / 10;

    const propertyEvents = activityByProperty.get(property.id) ?? [];
    const lastUpdatedAt = propertyEvents.length
      ? Math.max(...propertyEvents.map((event) => event.createdAt))
      : property.updatedAt;

    return {
      property,
      completionPct,
      hasEstateDoc,
      hasPrimaryShareBalance,
      unverifiedCount: assignedSuccessors.filter((successor) => !successor.verified).length,
      lastUpdatedAt,
      assignedSuccessorIds,
    };
  });

  const topPropertyIds = new Set(
    [
      ...effectiveAssignments.map((assignment) => assignment.propertyId),
      ...estateDocsRaw.map((doc) => doc.propertyId),
      ...activityRaw.map((event) => event.propertyId).filter(Boolean),
    ].filter(Boolean),
  );

  const selectedMetrics = propertyMetrics
    .filter((entry) => topPropertyIds.has(entry.property.id))
    .slice(0, 6);
  const fallbackMetrics = propertyMetrics
    .filter((entry) => !topPropertyIds.has(entry.property.id))
    .slice(0, Math.max(0, 4 - selectedMetrics.length));
  const displayedMetrics = [...selectedMetrics, ...fallbackMetrics];

  const estateProperties: EstateProperty[] = displayedMetrics.map((entry, index) => ({
    id: entry.property.id,
    name: entry.property.name,
    address: buildAddress(entry.property),
    status: deriveStatus(entry.completionPct),
    initials: initials(entry.property.name),
    color: COLOR_SWATCHES[index % COLOR_SWATCHES.length],
    completionPct: entry.completionPct,
    lastUpdatedLabel: formatDate(entry.lastUpdatedAt),
  }));

  const estateSuccessors: Successor[] = successorsRaw.map((successor) => ({
    id: successor.id,
    initials: successor.initials,
    name: successor.name,
    relation: successor.relation,
    role: successor.role,
    share: `${successor.share.toFixed(2)}%`,
    verified: successor.verified,
    propertyIds: Array.from(new Set(assignmentsBySuccessor.get(successor.id) ?? [])),
  }));

  const estateDocuments: EstateDocument[] = estateDocsRaw
    .sort((a, b) => b.uploadedAt - a.uploadedAt)
    .map((doc, index) => ({
      id: doc.id,
      propertyId: doc.propertyId,
      name: doc.name.replace(/_/g, " "),
      meta: estateDocumentMeta(doc),
      iconBg: index % 2 === 0 ? "#ffdad6" : "#c3c7cd",
    }));

  const timeline: TimelineItem[] = activityRaw
    .slice(0, 12)
    .map((event, index) => ({
      id: event.id,
      title: event.title,
      time: formatEventTime(event.createdAt),
      desc: event.description,
      active: index === 0,
      propertyId: event.propertyId,
    }));

  const coveredPropertyCount = propertyMetrics.filter(
    (entry) => entry.assignedSuccessorIds.length > 0,
  ).length;
  const portfolioCompletion =
    propertyMetrics.length === 0
      ? 0
      : Math.round(
          (propertyMetrics.reduce((sum, entry) => sum + entry.completionPct, 0) /
            propertyMetrics.length) *
            10,
        ) / 10;
  const pendingReviews =
    propertyMetrics.filter((entry) => !entry.hasPrimaryShareBalance).length +
    propertyMetrics.filter((entry) => !entry.hasEstateDoc).length +
    propertyMetrics.reduce((sum, entry) => sum + entry.unverifiedCount, 0);

  const assignedSuccessorCount = estateSuccessors.filter(
    (successor) => successor.propertyIds.length > 0,
  ).length;
  const unverifiedCount = estateSuccessors.filter((successor) => !successor.verified).length;

  return {
    stats: [
      {
        label: "Plan Completion",
        value: percent(portfolioCompletion),
        sub: `${coveredPropertyCount} of ${propertyMetrics.length} properties have assigned beneficiaries`,
        subVariant: "neutral",
        progress: portfolioCompletion,
        accent: true,
      },
      {
        label: "Pending Reviews",
        value: String(pendingReviews),
        sub: "Missing docs, share balance, or verification",
        subVariant: "danger",
        progress: null,
        accent: false,
      },
      {
        label: "Assigned Beneficiaries",
        value: String(assignedSuccessorCount),
        sub:
          unverifiedCount > 0
            ? `${unverifiedCount} beneficiaries still unverified`
            : "All assigned beneficiaries are verified",
        subVariant: "neutral",
        progress: null,
        accent: false,
      },
      {
        label: "Estate Documents",
        value: String(estateDocuments.length),
        sub: "Secured by Valgate",
        subVariant: "primary",
        progress: null,
        accent: true,
      },
    ],
    properties: estateProperties,
    successors: estateSuccessors,
    documents: estateDocuments,
    timeline,
  };
}
