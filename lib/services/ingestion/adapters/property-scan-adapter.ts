// Adapts the property document-scan extraction output into an IngestionCandidate<NewProperty>.
// Reuses scanToForm + mapWizardToProperty — the same transform chain the scan → wizard path uses.
// The scan UI continues to route to the wizard for single-property scans; this adapter
// exists so the scan output CAN feed into the unified review table in the future.

import { scanToForm } from "@/app/_shared/add-property/_lib/scan-to-form";
import { mapWizardToProperty } from "@/app/_shared/add-property/map-to-property";
import { defaultForm, type FormData as WizardForm } from "@/app/_shared/add-property/types";
import type { ExtractedProperty } from "@/lib/services/document-scan";
import type { NewProperty } from "@/lib/data/types/property";
import type { IngestionCandidate } from "../types";

export function fromScan(
  extracted: ExtractedProperty,
  lowConfidence: string[],
  fileName: string,
): IngestionCandidate<NewProperty> {
  const formPatch = scanToForm(extracted);
  const form: WizardForm = { ...defaultForm, ...formPatch, method: "scan" as const };
  const entity = mapWizardToProperty(form);
  const issues = lowConfidence.map((field) => ({
    field,
    severity: "warning" as const,
    message: "AI models disagreed on this value — please verify",
  }));
  return {
    id: crypto.randomUUID(),
    entity,
    source: { type: "scan", fileName },
    issues,
    confidence: lowConfidence.length > 0 ? "low" : "high",
  };
}
