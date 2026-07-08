import "server-only";
import { listDocuments } from "@/lib/services/documents";
import { getUserProfile } from "@/lib/services/user-profiles";
import { listLeases } from "@/lib/services/leases";
import { listTenants } from "@/lib/services/tenants";
import { listPayments } from "@/lib/services/payments";
import { listPropertyValuations } from "@/lib/services/property-valuations";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { listMaintenanceItems } from "@/lib/services/maintenance-items";
import { listProperties } from "@/lib/services/properties";
import { listClientRecords } from "@/lib/services/client-records";
import { getPortfolioSnapshot } from "@/lib/data/derivations/portfolio-snapshot";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import { requireCtx } from "@/lib/auth/ctx";
import { formatCurrency } from "@/lib/format";
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
  description: string | null;
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
    monthlyExpectedRaw: number;
    monthlyCollectedRaw: number;
  } | null;
  property: {
    id: string;
    name: string;
    type: string;
    status: string;
    address: string | null;
  } | null;
  // Set only on Pro routes scoped to a single owner-client
  // (/pro/clients/[clientId]). The manager-side counterpart to `property`.
  client: {
    id: string;
    name: string;
    clientType: string;
    propertyCount: number;
    managementFeePct: number | null;
  } | null;
  documents: AiWorkspaceDocument[];
  portfolioBars: AiPortfolioBar[];
  yieldHref: string;
  promptContext: string;
};

const PROPERTY_ROUTE = /^\/property\/([^/]+)/;
const PRO_CLIENT_ROUTE = /^\/pro\/clients\/([^/]+)/;

export function parsePropertyIdFromPath(pathname: string): string | null {
  const match = pathname.match(PROPERTY_ROUTE);
  return match?.[1] ?? null;
}

// Extracts the clientId from /pro/clients/<id>. Returns null for the
// book-wide /pro/clients list route and every other Pro route.
export function parseClientIdFromPath(pathname: string): string | null {
  const match = pathname.match(PRO_CLIENT_ROUTE);
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

function fmt(n: number | undefined | null): string {
  if (n == null || n === 0) return "—";
  return formatCurrency(n);
}

function fmtDate(ts: number | undefined | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function toWorkspaceDocument(doc: Document): AiWorkspaceDocument {
  const userId = getCurrentUserId();
  return {
    id: doc.id,
    name: doc.name,
    propertyId: doc.propertyId,
    category: doc.category ?? "Other",
    description: doc.description ?? null,
    mimeType: doc.mimeType ?? null,
    sizeBytes: doc.sizeBytes ?? null,
    href: `/data/users/${userId}/${doc.storageId}`,
  };
}

export function buildSessionTitle(context: AiOverlayContext): string {
  if (context.client) {
    return `${context.client.name}`;
  }
  if (context.property) {
    return `${context.property.name}`;
  }
  if (context.pathname.startsWith("/pro")) {
    return "Manager cockpit";
  }
  if (context.portfolio) {
    const n = context.portfolio.propertyCount;
    return `Portfolio — ${n} ${n === 1 ? "property" : "properties"}`;
  }
  return "New conversation";
}

export function buildWelcomeMessage(context: AiOverlayContext): string {
  if (context.client) {
    const c = context.client;
    const lines = [
      `You're managing **${c.name}**'s portfolio (${c.propertyCount} ${c.propertyCount === 1 ? "property" : "properties"}, ${c.clientType}).`,
      c.managementFeePct != null ? `Management fee: ${c.managementFeePct}%.` : null,
      "",
      "Ask about this client's rent collection, work orders, or compliance — or generate their owner statement. Every figure comes from your real book; I won't invent numbers.",
    ].filter(Boolean);
    return lines.join("\n");
  }

  if (context.pathname.startsWith("/pro") && context.portfolio) {
    const { stats, kpis } = context.portfolio;
    return [
      `Welcome back, ${context.userName.split(" ")[0] || "there"} — here's your book at a glance:`,
      "",
      `- **${stats.totalProperties}** active properties`,
      `- **${stats.occupancyRate}%** occupancy (${stats.rentedCount} rented, ${stats.vacantCount} vacant)`,
      `- **${kpis.totalValueFormatted}** total book value`,
      `- **${kpis.monthlyCollected}** collected vs **${kpis.monthlyExpected}** expected this month (${kpis.monthLabel})`,
      "",
      "Ask about overdue rent, open work orders, expiring certificates, or a specific client.",
    ].join("\n");
  }

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

export async function buildAiOverlayContext(
  pathname: string,
): Promise<AiOverlayContext> {
  const authCtx = await requireCtx();
  const propertyId = parsePropertyIdFromPath(pathname);
  const clientId = parseClientIdFromPath(pathname);
  const isProRoute = pathname.startsWith("/pro");

  // Fetch everything in parallel — the AI needs the full picture regardless of current page
  const [
    profile,
    allProperties,
    allDocuments,
    allLeases,
    allTenants,
    allPayments,
    allValuations,
    allOwnershipRecords,
    allMaintenance,
    allClients,
    pageData,
  ] = await Promise.all([
    getUserProfile(authCtx, authCtx.userId),
    listProperties(authCtx),
    listDocuments(authCtx),
    listLeases(authCtx),
    listTenants(authCtx),
    listPayments(authCtx),
    listPropertyValuations(authCtx),
    listOwnershipRecords(authCtx),
    listMaintenanceItems(authCtx),
    listClientRecords(authCtx),
    getPortfolioSnapshot(),
  ]);

  const firstName = profile?.firstName ?? "User";
  const lastName = profile?.lastName ?? "";
  const userName = `${firstName} ${lastName}`.trim();
  const userInitials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";

  // ── Compute raw monthly rent amounts for yield calculations ──────────────
  const nowMs = Date.now();
  const monthStart = Date.UTC(
    new Date(nowMs).getUTCFullYear(),
    new Date(nowMs).getUTCMonth(),
    1,
  );
  const monthlyExpectedRaw = allLeases
    .filter((l) => l.stage === "Signed" && l.endDate >= monthStart)
    .reduce((sum, l) => sum + l.monthlyRent, 0);
  const monthlyCollectedRaw = allPayments
    .filter((p) => p.kind === "Rent" && p.status === "Paid" && p.date >= monthStart)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  // ── UI context (drives header, sidebar bars, yield link) ─────────────────
  let portfolio: AiOverlayContext["portfolio"] = null;
  let property: AiOverlayContext["property"] = null;
  let client: AiOverlayContext["client"] = null;
  let portfolioBars: AiPortfolioBar[] = [];
  let yieldHref = "/analytics";
  let header: AiOverlayHeader = {
    title: "Valgate Intelligence",
    subtitle: null,
    badge: null,
  };

  if (pathname.startsWith("/portfolio") || pathname === "/") {
    portfolio = {
      stats: pageData.stats,
      kpis: pageData.kpis,
      propertyCount: pageData.properties.length,
      monthlyExpectedRaw,
      monthlyCollectedRaw,
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

  // ── Pro (manager) routes ─────────────────────────────────────────────────
  // The Pro cockpit is the manager overseeing the whole book. On any /pro
  // route we surface book-wide context; on /pro/clients/<id> we narrow the
  // header, the asset bars, and the scoped documents to that one owner-client.
  if (isProRoute) {
    yieldHref = "/pro/dashboard";

    // Reuse the book already loaded by listClientRecords in the Promise.all
    // above (identical ClientRecordSummary shape, same manager scoping) instead
    // of a second DB roundtrip on every overlay open on a /pro/clients/<id> route.
    const clientRecord = clientId
      ? (allClients.find((c) => c.id === clientId) ?? null)
      : null;

    if (clientRecord) {
      const clientProperties = allProperties.filter(
        (p) => !p.isArchived && p.clientId === clientRecord.id,
      );
      client = {
        id: clientRecord.id,
        name: clientRecord.name,
        clientType: clientRecord.clientType,
        propertyCount: clientProperties.length,
        managementFeePct: clientRecord.managementFeePct ?? null,
      };
      yieldHref = `/pro/clients/${clientRecord.id}`;
      portfolioBars = clientProperties
        .filter((p) => p.buyNumeric > 0)
        .sort((a, b) => b.buyNumeric - a.buyNumeric)
        .slice(0, 5)
        .map((p) => ({
          label: p.name.length > 18 ? `${p.name.slice(0, 16)}…` : p.name,
          value: p.buyNumeric,
          propertyId: p.id,
        }));
      header = {
        title: clientRecord.name,
        subtitle: `${clientProperties.length} ${clientProperties.length === 1 ? "property" : "properties"} · ${clientRecord.clientType}`,
        badge: "Client",
      };
    } else {
      // Book-wide manager cockpit (dashboard, properties, rent, work-orders,
      // compliance, clients list). The whole portfolio is the manager's scope.
      portfolio = {
        stats: pageData.stats,
        kpis: pageData.kpis,
        propertyCount: pageData.properties.length,
        monthlyExpectedRaw,
        monthlyCollectedRaw,
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
        title: "Manager cockpit",
        subtitle: `${pageData.properties.length} properties · ${pageData.stats.occupancyRate}% occupancy`,
        badge: "Pro",
      };
    }
  }

  // Documents shown in the assets pane are scoped to the property, the
  // client's properties, or the whole book — in that order of specificity.
  const clientPropertyIds = client
    ? new Set(
        allProperties
          .filter((p) => p.clientId === client!.id)
          .map((p) => p.id),
      )
    : null;
  const scopedDocuments = propertyId
    ? allDocuments.filter((d) => d.propertyId === propertyId)
    : clientPropertyIds
      ? allDocuments.filter((d) => clientPropertyIds.has(d.propertyId))
      : allDocuments;

  const documents = scopedDocuments
    .filter((d) => d.kind === "document")
    .slice(0, 50)
    .map(toWorkspaceDocument);

  // ── Build comprehensive prompt context ───────────────────────────────────
  const activeProperties = allProperties.filter((p) => !p.isArchived);

  const lines: string[] = [
    `User: ${userName}`,
    `Current page: ${pathname}`,
    "",
    "=== PORTFOLIO SUMMARY ===",
    `- Total active properties: ${pageData.stats.totalProperties}`,
    `- Total portfolio value: ${pageData.kpis.totalValueFormatted}`,
    `- Occupancy: ${pageData.stats.occupancyRate}% (${pageData.stats.rentedCount} rented, ${pageData.stats.vacantCount} vacant)`,
    `- Monthly expected rent: ${pageData.kpis.monthlyExpected}`,
    `- Monthly collected: ${pageData.kpis.monthlyCollected} (${pageData.kpis.monthLabel})`,
    "",
    "=== PROPERTIES ===",
  ];

  for (const p of activeProperties) {
    const address = formatAddress({
      addressLine: p.addressLine,
      city: p.city,
      province: p.province,
    });
    lines.push(
      `${p.id}: "${p.name}"`,
      `  type: ${p.type} | status: ${p.status} | use: ${p.propertyUse ?? "—"}`,
      `  address: ${address ?? "—"}`,
      `  purchasePrice: ${fmt(p.buyNumeric)} | purchaseDate: ${fmtDate(p.purchaseDate)}`,
      `  currentMarketValue: ${fmt(p.currentMarketValue)}`,
      `  outstandingMortgage: ${fmt(p.outstandingMortgage)} | monthlyPayment: ${fmt(p.monthlyPayment)}`,
      `  interestRate: ${p.interestRate != null ? `${p.interestRate}%` : "—"}`,
      `  annualTax: ${fmt(p.annualPropertyTax)} | annualInsurance: ${fmt(p.annualInsurance)}`,
      `  bedrooms: ${p.bedrooms ?? "—"} | bathrooms: ${p.bathrooms ?? "—"} | area: ${p.totalArea ? `${p.totalArea} sqm` : "—"} | yearBuilt: ${p.yearBuilt ?? "—"}`,
      `  url: /property/${p.id}`,
    );
  }

  // ── Leases ────────────────────────────────────────────────────────────────
  const activeLeases = allLeases.filter((l) => l.stage === "Signed");
  if (activeLeases.length > 0) {
    lines.push("", "=== ACTIVE LEASES ===");
    for (const l of activeLeases) {
      const tenant = allTenants.find((t) => t.id === l.tenantId);
      lines.push(
        `${l.id}: ${l.propertyId} | tenant: ${tenant?.name ?? l.tenantId ?? "—"} | unit: ${l.unit ?? "—"}`,
        `  monthlyRent: ${fmt(l.monthlyRent)} | term: ${l.termMonths} months`,
        `  period: ${fmtDate(l.startDate)} – ${fmtDate(l.endDate)}`,
        `  renewal: ${l.renewalStatus ?? "—"}`,
      );
    }
  }

  // ── Tenants ───────────────────────────────────────────────────────────────
  if (allTenants.length > 0) {
    lines.push("", "=== TENANTS ===");
    for (const t of allTenants) {
      lines.push(
        `${t.id}: "${t.name}" | property: ${t.propertyId} | unit: ${t.unit ?? "—"}`,
        `  monthlyRent: ${fmt(t.rent)} | paymentStatus: ${t.status}`,
        `  contact: ${t.email ?? "—"} | ${t.phone ?? "—"}`,
      );
    }
  }

  // ── Most recent valuation per property ───────────────────────────────────
  if (allValuations.length > 0) {
    const latestByProp = new Map<string, (typeof allValuations)[0]>();
    for (const v of allValuations) {
      const existing = latestByProp.get(v.propertyId);
      if (!existing || v.recordedAt > existing.recordedAt) {
        latestByProp.set(v.propertyId, v);
      }
    }
    lines.push("", "=== LATEST VALUATIONS ===");
    for (const [propId, v] of latestByProp.entries()) {
      lines.push(`${propId}: ${fmt(v.price)} (${v.month})`);
    }
  }

  // ── Recent payments (last 90 days) ───────────────────────────────────────
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recentPayments = allPayments
    .filter((p) => p.date >= ninetyDaysAgo)
    .sort((a, b) => b.date - a.date)
    .slice(0, 30);

  if (recentPayments.length > 0) {
    lines.push("", "=== RECENT PAYMENTS (last 90 days) ===");
    for (const p of recentPayments) {
      const lease = allLeases.find((l) => l.id === p.leaseId);
      lines.push(
        `${p.id}: ${lease?.propertyId ?? p.leaseId ?? "—"} | ${p.kind} | ${fmt(p.amount)} | ${p.status} | ${fmtDate(p.date)} | method: ${p.method}`,
      );
    }
  }

  // ── Ownership records ────────────────────────────────────────────────────
  if (allOwnershipRecords.length > 0) {
    lines.push("", "=== OWNERSHIP RECORDS ===");
    for (const o of allOwnershipRecords) {
      lines.push(
        `${o.id}: ${o.propertyId} | holdingType: ${o.holdingType}`,
        `  lender: ${o.lenderName ?? "—"} | loanAmount: ${fmt(o.loanAmount)} | rate: ${o.interestRate != null ? `${o.interestRate}%` : "—"} | loanType: ${o.loanType ?? "—"}`,
        `  maturity: ${fmtDate(o.maturityDate)} | nextPaymentDue: ${fmtDate(o.nextPaymentDue)}`,
      );
    }
  }

  // ── Open maintenance items ────────────────────────────────────────────────
  const openMaintenance = allMaintenance.filter((m) => m.status !== "Resolved");
  if (openMaintenance.length > 0) {
    lines.push("", "=== OPEN MAINTENANCE ITEMS ===");
    for (const m of openMaintenance) {
      lines.push(
        `${m.id}: ${m.propertyId} | "${m.title}" | severity: ${m.severity} | status: ${m.status}`,
      );
    }
  }

  // ── Documents ────────────────────────────────────────────────────────────
  const docLines = allDocuments
    .filter((d) => d.kind === "document")
    .slice(0, 30)
    .map((d) => `${d.id}: "${d.name}" (${d.category ?? "Other"}) | property: ${d.propertyId}`);

  if (docLines.length > 0) {
    lines.push("", "=== DOCUMENTS ===", ...docLines);
  }

  // ── Clients / book of business (Pro) ─────────────────────────────────────
  // Each Client is an owner the manager reports to; properties belong to a
  // client via Property.clientId. This section lets the agent answer
  // cross-client questions and group the book by owner.
  if (allClients.length > 0) {
    lines.push("", "=== CLIENTS (BOOK OF BUSINESS) ===");
    if (client) {
      lines.push(`Currently focused on client: "${client.name}" (${client.id})`);
    }
    for (const c of allClients) {
      const props = activeProperties.filter((p) => p.clientId === c.id);
      const propList = props.map((p) => p.id).join(", ") || "—";
      lines.push(
        `${c.id}: "${c.name}" (${c.clientType})`,
        `  managementFee: ${c.managementFeePct != null ? `${c.managementFeePct}%` : "—"} | properties (${props.length}): ${propList}`,
      );
    }
    const unassigned = activeProperties.filter((p) => !p.clientId);
    if (unassigned.length > 0) {
      lines.push(
        `Unassigned properties (${unassigned.length}): ${unassigned.map((p) => p.id).join(", ")}`,
      );
    }
  }

  const promptContext = lines.join("\n");

  const context: AiOverlayContext = {
    pathname,
    propertyId,
    header,
    userInitials,
    userName,
    portfolio,
    property,
    client,
    documents,
    portfolioBars,
    yieldHref,
    promptContext,
  };

  return context;
}

export function toClientContext(context: AiOverlayContext): AiOverlayClientContext {
  const { promptContext: _removed, ...clientContext } = context;
  return clientContext;
}
