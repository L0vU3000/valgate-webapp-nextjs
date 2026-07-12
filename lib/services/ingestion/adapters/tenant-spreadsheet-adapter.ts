// Adapts the tenant spreadsheet assembled rows into IngestionCandidate<NewTenant>[].
// Reuses toTenantCandidate + resolveProperty — the same normalization + linkage logic.

import { listProperties } from "@/lib/services/properties";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import { toTenantCandidate, type TenantCandidate } from "@/lib/services/tenant-import";
import type { AssembledRow, SheetData } from "@/lib/services/entity-import";
import type { NewTenant } from "@/lib/data/types/tenant";
import type { Ctx } from "@/lib/services/_mapping";
import type { IngestionCandidate, IngestionIssue, PropertyOption } from "../types";

export type TenantAdaptResult = {
  candidates: IngestionCandidate<NewTenant>[];
  properties: PropertyOption[];
  primarySheet: string | null;
};

function toNewTenant(c: TenantCandidate): NewTenant {
  return {
    propertyId: c.propertyId,
    name: c.name,
    unit: c.unit || "—",
    rent: c.rent,
    status: c.status,
    email: c.email || undefined,
    phone: c.phone || undefined,
  };
}

export async function fromTenantSpreadsheet(
  ctx: Ctx,
  assembled: AssembledRow[],
  primarySheet: string | null,
  sheets: SheetData[],
  fileName: string,
): Promise<TenantAdaptResult> {
  const properties = await listProperties(ctx);
  const options: PropertyOption[] = properties.map((p) => ({ id: p.id, label: p.name }));
  const matches: PropertyMatch[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    title: p.title,
  }));

  const candidates = assembled.map((row, i) => {
    const candidate = toTenantCandidate(row);
    candidate.propertyId = resolveProperty(candidate.rawProperty, matches);
    if (!candidate.propertyId && candidate.rawProperty) {
      candidate.issues.push("No matching property — pick one");
    }

    const issues: IngestionIssue[] = candidate.issues.map((msg) => ({
      field: "",
      severity: msg.includes("No matching") ? "error" : "warning",
      message: msg,
    }));

    return {
      id: crypto.randomUUID(),
      entity: toNewTenant(candidate),
      source: { type: "spreadsheet" as const, sheet: primarySheet ?? undefined, row: i + 1, fileName },
      issues,
      confidence: "high" as const,
    };
  });

  return { candidates, properties: options, primarySheet };
}
