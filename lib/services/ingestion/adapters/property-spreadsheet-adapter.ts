// Adapts the property spreadsheet import candidates into IngestionCandidate<NewProperty>[].
// Thin wrapper: reuses mapWizardToProperty — the canonical FormData → NewProperty transform.

import { mapWizardToProperty } from "@/app/_shared/add-property/map-to-property";
import type { NewProperty } from "@/lib/data/types/property";
import type { ImportCandidate } from "@/lib/services/property-import";
import type { IngestionCandidate, IngestionIssue } from "../types";

export function fromPropertySpreadsheet(
  candidates: ImportCandidate[],
  sheetName: string,
  fileName: string,
): IngestionCandidate<NewProperty>[] {
  return candidates.map((c, i) => {
    const entity = mapWizardToProperty(c.form);
    const issues: IngestionIssue[] = c.issues.map((msg) => ({
      field: "",
      severity: "warning" as const,
      message: msg,
    }));
    if (c.needsLocation) {
      issues.push({ field: "lat", severity: "warning", message: "Needs location pin" });
    }
    return {
      id: crypto.randomUUID(),
      entity,
      source: { type: "spreadsheet", sheet: sheetName, row: i + 1, fileName },
      issues,
      confidence: "high",
    };
  });
}
