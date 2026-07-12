// Adapts the valuation spreadsheet assembled rows into IngestionCandidate<NewPropertyValuation>[].
// Reuses toValuationCandidate + resolveProperty — the same normalization + linkage logic.

import { listProperties } from "@/lib/services/properties";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import {
  toValuationCandidate,
  type ValuationCandidate,
} from "@/lib/services/valuation-import";
import { recordedAtForMonth } from "@/lib/services/valuation-import";
import type { AssembledRow } from "@/lib/services/entity-import";
import type { NewPropertyValuation } from "@/lib/data/types/property-valuation";
import type { Ctx } from "@/lib/services/_mapping";
import type { IngestionCandidate, IngestionIssue, PropertyOption } from "../types";

export type ValuationAdaptResult = {
  candidates: IngestionCandidate<NewPropertyValuation>[];
  properties: PropertyOption[];
  primarySheet: string | null;
};

function toNewPropertyValuation(c: ValuationCandidate): NewPropertyValuation {
  return {
    propertyId: c.propertyId,
    month: c.month,
    price: c.price,
    recordedAt: recordedAtForMonth(c.recordedAt, c.month),
  };
}

export async function fromValuationSpreadsheet(
  ctx: Ctx,
  assembled: AssembledRow[],
  primarySheet: string | null,
  fileName: string,
): Promise<ValuationAdaptResult> {
  const properties = await listProperties(ctx);
  const options: PropertyOption[] = properties.map((p) => ({ id: p.id, label: p.name }));
  const matches: PropertyMatch[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    title: p.title,
  }));

  const candidates = assembled.map((row, i) => {
    const candidate = toValuationCandidate(row);
    candidate.propertyId = resolveProperty(candidate.rawProperty, matches);
    if (!candidate.propertyId && candidate.rawProperty) {
      candidate.issues.push("No matching property — pick one");
    }

    const issues: IngestionIssue[] = candidate.issues.map((msg) => ({
      field: "",
      severity: msg.includes("No valid") || msg.includes("No property") ? "error" : "warning",
      message: msg,
    }));

    return {
      id: crypto.randomUUID(),
      entity: toNewPropertyValuation(candidate),
      source: { type: "spreadsheet" as const, sheet: primarySheet ?? undefined, row: i + 1, fileName },
      issues,
      confidence: "high" as const,
    };
  });

  return { candidates, properties: options, primarySheet };
}
