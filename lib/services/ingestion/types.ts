// Shared types for the unified ingestion pipeline. Every data source — document scan,
// spreadsheet import for properties/tenants/valuations — produces IngestionCandidate<T>[]
// after extraction. The review component and persist layer are generic over T.
//
// This module is type-only (no "server-only" import) so client components can import
// the type aliases without pulling server-side code into the browser bundle.

export type IngestionSourceType = "spreadsheet" | "scan";

export type IngestionSource = {
  type: IngestionSourceType;
  sheet?: string;
  row?: number;
  fileName?: string;
};

export type IngestionIssueSeverity = "error" | "warning";

export type IngestionIssue = {
  field: string;
  severity: IngestionIssueSeverity;
  message: string;
};

export type IngestionCandidate<T> = {
  id: string;
  entity: T;
  source: IngestionSource;
  issues: IngestionIssue[];
  confidence: "high" | "low";
};

export type BulkResult = {
  created: number;
  failures: { row: number; name: string; reason: string }[];
};

// ─── Review table column config ──────────────────────────────────────────────

export type ColumnControl = "text" | "select" | "number";

export type SelectOption = { value: string; label: string };

export type ColumnConfig = {
  field: string;
  label: string;
  editable: boolean;
  control: ColumnControl;
  options?: SelectOption[];
  required?: boolean;
  validate?: (value: string) => string | null;
  width?: string;
  format?: (row: Record<string, string>) => string;
};

// A row in the review table: all values as strings (editable), with metadata for
// issue display and the original raw property reference (for the property picker
// placeholder when the AI's match failed).
export type ReviewRow = {
  values: Record<string, string>;
  rawProperty?: string;
  issues: string[];
};

export type PropertyOption = { id: string; label: string };

export type EntityType =
  | "properties" | "tenants" | "valuations" | "leases" | "payments" | "expenses"
  | "coOwners" | "maintenance" | "inspections" | "certifications" | "safetyRisks"
  | "emergencyContacts" | "successors" | "landParcels";

export type PerEntityRows = Record<EntityType, ReviewRow[]>;
