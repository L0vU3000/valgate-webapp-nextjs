import "server-only";
import * as documentsDb from "@/lib/data/db/documents";
import * as userProfilesDb from "@/lib/data/db/user-profiles";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getPortfolioSnapshot } from "@/lib/data/derivations/portfolio-snapshot";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Document, DocumentCategory } from "@/lib/data/types/document";
import type { PortfolioStats, PortfolioKpis } from "@/lib/data/derivations/portfolio";

export type AiOverlayHeader = {
  title: string;
  subtitle: string | null;
  badge: string | null;
};

export type AiWorkspaceDocument = {
  id: string;
  name: string;
  propertyId: string;
  category: DocumentCategory | "Other";
  mimeType: string | null;
  sizeBytes: number | null;
  href: string;
};

export type AiPortfolioBar = {
  label: string;
  value: number;
  propertyId: string;
};

export type AiOverlayClientContext = Omit<AiOverlayContext, "promptContext">;

export type AiOverlayContext = {
  pathname: string;
  propertyId: string | null;
  header: AiOverlayHeader;
  userInitials: string;
  userName: string;
  portfolio: {
    stats: PortfolioStats;
    kpis: PortfolioKpis;
    propertyCount: number;
  } | null;
  property: {
    id: string;
    name: string;
    type: string;
    status: string;
    address: string | null;
  } | null;
  documents: AiWorkspaceDocument[];
  portfolioBars: AiPortfolioBar[];
  yieldHref: string;
  promptContext: string;
};

const PROPERTY_ROUTE = /^\/property\/([^/]+)/;

export function parsePropertyIdFromPath(pathname: string): string | null {
  const match = pathname.match(PROPERTY_ROUTE);
  return match?.[1] ?? null;
}

function formatAddress(parts: {
  addressLine?: string;
  city?: string;
  province?: string;
}): string | null {
  const line = [parts.addressLine, parts.city, parts.province]
    .filter(Boolean)
    .join(", ");
  return line || null;
}

function toWorkspaceDocument(doc: Document): AiWorkspaceDocument {
  const userId = getCurrentUserId();
  return {
    id: doc.id,
    name: doc.name,
    propertyId: doc.propertyId,
    category: doc.category ?? "Other",
    mimeType: doc.mimeType ?? null,
    sizeBytes: doc.sizeBytes ?? null,
    href: `/data/users/${userId}/${doc.storageId}`,
  };
}

export function buildSessionTitle(context: AiOverlayContext): string {
  if (context.property) {
    return `${context.property.name}`;
  }
  if (context.portfolio) {
    const n = context.portfolio.propertyCount;
    return `Portfolio — ${n} ${n === 1 ? "property" : "properties"}`;
  }
  return "New conversation";
}

export function buildWelcomeMessage(context: AiOverlayContext): string {
  if (context.property) {
    const p = context.property;
    const lines = [
      `You're viewing **${p.name}** (${p.type}, ${p.status}).`,
      p.address ? `Address: ${p.address}.` : null,
      "",
      "Ask about this property's documents, rental status, financials, or progress. I only use data from your portfolio — I won't invent numbers.",
    ].filter(Boolean);
    return lines.join("\n");
  }

  if (context.portfolio) {
    const { stats, kpis } = context.portfolio;
    return [
      `Welcome back, ${context.userName.split(" ")[0] || "there"}. Here's your portfolio at a glance:`,
      "",
      `- **${stats.totalProperties}** active properties`,
      `- **${stats.occupancyRate}%** occupancy (${stats.rentedCount} rented, ${stats.vacantCount} vacant)`,
      `- **${kpis.totalValueFormatted}** total portfolio value`,
      `- **${kpis.monthlyCollected}** collected vs **${kpis.monthlyExpected}** expected rent this month (${kpis.monthLabel})`,
      "",
      "Ask about occupancy, rent collection, a specific property, or your documents.",
    ].join("\n");
  }

  return [
    `Hi ${context.userName.split(" ")[0] || "there"} — I'm Valgate Intelligence.`,
    "",
    "Navigate to your portfolio or a property page for richer context, or ask a general question about your account.",
  ].join("\n");
}

function buildPromptContext(context: AiOverlayContext): string {
  const sections: string[] = [
    `Current route: ${context.pathname}`,
    `User: ${context.userName} (${context.userInitials})`,
  ];

  if (context.portfolio) {
    const { stats, kpis } = context.portfolio;
    sections.push(
      "Portfolio:",
      `- activeProperties: ${stats.totalProperties}`,
      `- totalValue: ${stats.totalValue}`,
      `- occupancyRate: ${stats.occupancyRate}%`,
      `- rentedCount: ${stats.rentedCount}`,
      `- vacantCount: ${stats.vacantCount}`,
      `- monthlyExpected: ${kpis.monthlyExpected}`,
      `- monthlyCollected: ${kpis.monthlyCollected}`,
      `- monthLabel: ${kpis.monthLabel}`,
    );
  }

  if (context.property) {
    const p = context.property;
    sections.push(
      "Property:",
      `- id: ${p.id}`,
      `- name: ${p.name}`,
      `- type: ${p.type}`,
      `- status: ${p.status}`,
      `- address: ${p.address ?? "unknown"}`,
      `- rentalUrl: /property/${p.id}/rental`,
      `- documentsUrl: /property/${p.id}/documents`,
    );
  }

  if (context.documents.length > 0) {
    sections.push(
      "Documents:",
      ...context.documents.slice(0, 20).map(
        (d) =>
          `- ${d.id}: ${d.name} (${d.category}) property=${d.propertyId} url=${d.href}`,
      ),
    );
  }

  return sections.join("\n");
}

export async function buildAiOverlayContext(
  pathname: string,
): Promise<AiOverlayContext> {
  const userId = getCurrentUserId();
  const propertyId = parsePropertyIdFromPath(pathname);

  const [profile, allDocuments] = await Promise.all([
    userProfilesDb.get(userId, userId),
    documentsDb.list(userId),
  ]);

  const firstName = profile?.firstName ?? "User";
  const lastName = profile?.lastName ?? "";
  const userName = `${firstName} ${lastName}`.trim();
  const userInitials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";

  let portfolio: AiOverlayContext["portfolio"] = null;
  let property: AiOverlayContext["property"] = null;
  let portfolioBars: AiPortfolioBar[] = [];
  let yieldHref = "/analytics";
  let header: AiOverlayHeader = {
    title: "Valgate Intelligence",
    subtitle: null,
    badge: null,
  };

  if (pathname.startsWith("/portfolio") || pathname === "/") {
    const pageData = await getPortfolioSnapshot();
    portfolio = {
      stats: pageData.stats,
      kpis: pageData.kpis,
      propertyCount: pageData.properties.length,
    };
    portfolioBars = pageData.properties
      .filter((p) => p.buyNumeric > 0)
      .sort((a, b) => b.buyNumeric - a.buyNumeric)
      .slice(0, 5)
      .map((p) => ({
        label: p.name.length > 18 ? `${p.name.slice(0, 16)}…` : p.name,
        value: p.buyNumeric,
        propertyId: p.id,
      }));
    header = {
      title: "Portfolio overview",
      subtitle: `${pageData.properties.length} properties · ${pageData.stats.occupancyRate}% occupancy`,
      badge: "Portfolio",
    };
  }

  if (propertyId) {
    yieldHref = `/property/${propertyId}/financials`;
    const prop = await getPropertyByIdParam(propertyId);
    if (prop) {
      const address = formatAddress({
        addressLine: prop.addressLine,
        city: prop.city,
        province: prop.province,
      });
      property = {
        id: prop.id,
        name: prop.name,
        type: prop.type,
        status: prop.status,
        address,
      };
      if (prop.buyNumeric > 0) {
        portfolioBars = [
          {
            label: prop.name.length > 18 ? `${prop.name.slice(0, 16)}…` : prop.name,
            value: prop.buyNumeric,
            propertyId: prop.id,
          },
        ];
      }
      header = {
        title: prop.name,
        subtitle: address,
        badge: prop.type,
      };
    }
  }

  const scopedDocuments = propertyId
    ? allDocuments.filter((d) => d.propertyId === propertyId)
    : allDocuments;

  const documents = scopedDocuments
    .filter((d) => d.kind === "document")
    .slice(0, 50)
    .map(toWorkspaceDocument);

  const context: AiOverlayContext = {
    pathname,
    propertyId,
    header,
    userInitials,
    userName,
    portfolio,
    property,
    documents,
    portfolioBars,
    yieldHref,
    promptContext: "",
  };

  context.promptContext = buildPromptContext(context);
  return context;
}

export function toClientContext(context: AiOverlayContext): AiOverlayClientContext {
  const { promptContext: _removed, ...clientContext } = context;
  return clientContext;
}
