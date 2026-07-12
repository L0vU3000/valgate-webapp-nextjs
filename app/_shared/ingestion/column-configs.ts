import { MONTH_REGEX } from "@/lib/data/types/property-valuation";
import type { ColumnConfig, EntityType } from "@/lib/services/ingestion/types";

const TYPE_OPTIONS = [
  { value: "residential", label: "residential" },
  { value: "commercial", label: "commercial" },
  { value: "multi-unit", label: "multi-unit" },
  { value: "retail", label: "retail" },
  { value: "land", label: "land" },
  { value: "industrial", label: "industrial" },
  { value: "construction", label: "construction" },
  { value: "other", label: "other" },
];

const STATUS_OPTIONS = [
  { value: "", label: "—" },
  { value: "Rented", label: "Rented" },
  { value: "Vacant", label: "Vacant" },
  { value: "Owner-Occupied", label: "Owner-Occupied" },
];

const TENANT_STATUS_OPTIONS = [
  { value: "Paid", label: "Paid" },
  { value: "Overdue", label: "Overdue" },
  { value: "Pending", label: "Pending" },
];

export const propertyColumns: ColumnConfig[] = [
  { field: "propertyName", label: "Name", editable: true, control: "text", required: true, width: "200px" },
  { field: "propertyType", label: "Type", editable: true, control: "select", required: true, options: TYPE_OPTIONS },
  { field: "status", label: "Status", editable: true, control: "select", options: STATUS_OPTIONS },
  { field: "city", label: "City", editable: true, control: "text", width: "120px" },
  {
    field: "price",
    label: "Price",
    editable: false,
    control: "text",
    format: (r) => r.purchasePrice || r.currentMarketValue || "—",
  },
  {
    field: "location",
    label: "Location",
    editable: false,
    control: "text",
    format: (r) => r.needsLocation === "true" ? "Needs location" : "Located",
  },
];

export const tenantColumns: ColumnConfig[] = [
  { field: "name", label: "Name", editable: true, control: "text", required: true, width: "160px" },
  {
    field: "propertyId",
    label: "Property",
    editable: true,
    control: "select",
    required: true,
    width: "180px",
  },
  { field: "unit", label: "Unit", editable: true, control: "text", width: "100px" },
  { field: "rent", label: "Rent (USD)", editable: true, control: "number", width: "100px" },
  { field: "status", label: "Status", editable: true, control: "select", options: TENANT_STATUS_OPTIONS },
  { field: "email", label: "Email", editable: true, control: "text", width: "180px" },
  { field: "phone", label: "Phone", editable: true, control: "text", width: "130px" },
];

export const valuationColumns: ColumnConfig[] = [
  {
    field: "propertyId",
    label: "Property",
    editable: true,
    control: "select",
    required: true,
    width: "220px",
  },
  {
    field: "month",
    label: "Month",
    editable: true,
    control: "text",
    required: true,
    width: "120px",
    validate: (s) => (MONTH_REGEX.test(s.trim()) ? null : "Use MMM YYYY (e.g. Jan 2026)"),
  },
  {
    field: "price",
    label: "Market value (USD)",
    editable: true,
    control: "number",
    required: true,
    width: "140px",
    validate: (s) => {
      if (/-/.test(s)) return "Price must be positive";
      const v = Number.parseFloat(s.replace(/[^0-9.]/g, ""));
      return Number.isNaN(v) || v <= 0 ? "Price must be positive" : null;
    },
  },
];

// ─── 11 new entity column configs ────────────────────────────────────

const LEASE_STAGE_OPTIONS = [
  { value: "Approaching", label: "Approaching" },
  { value: "Offered", label: "Offered" },
  { value: "Signed", label: "Signed" },
  { value: "Declined", label: "Declined" },
];
const PAYMENT_KIND_OPTIONS = [
  { value: "Rent", label: "Rent" },
  { value: "Fee", label: "Fee" },
  { value: "Deposit", label: "Deposit" },
  { value: "Refund", label: "Refund" },
];
const PAYMENT_METHOD_OPTIONS = [
  { value: "ABA Bank", label: "ABA Bank" },
  { value: "Wing", label: "Wing" },
  { value: "Wire transfer", label: "Wire transfer" },
  { value: "Cash", label: "Cash" },
];
const PAYMENT_STATUS_OPTIONS = [
  { value: "Paid", label: "Paid" },
  { value: "Pending", label: "Pending" },
  { value: "Failed", label: "Failed" },
  { value: "Overdue", label: "Overdue" },
];
const EXPENSE_CATEGORY_OPTIONS = [
  { value: "Maintenance", label: "Maintenance" },
  { value: "Utilities", label: "Utilities" },
  { value: "Insurance", label: "Insurance" },
  { value: "Tax", label: "Tax" },
  { value: "Management", label: "Management" },
  { value: "Other", label: "Other" },
];
const CO_OWNER_ROLE_OPTIONS = [
  { value: "Primary", label: "Primary" },
  { value: "Minor", label: "Minor" },
];
const TAX_ENTITY_OPTIONS = [
  { value: "Individual", label: "Individual" },
  { value: "S-Corp", label: "S-Corp" },
  { value: "C-Corp", label: "C-Corp" },
  { value: "LLC", label: "LLC" },
  { value: "Partnership", label: "Partnership" },
  { value: "Trust", label: "Trust" },
  { value: "Other", label: "Other" },
];
const MAINTENANCE_SEVERITY_OPTIONS = [
  { value: "Emergency", label: "Emergency" },
  { value: "Urgent", label: "Urgent" },
  { value: "Standard", label: "Standard" },
];
const MAINTENANCE_STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "InProgress", label: "InProgress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Cancelled", label: "Cancelled" },
];
const INSPECTION_TYPE_OPTIONS = [
  { value: "Annual Fire Safety", label: "Annual Fire Safety" },
  { value: "Electrical", label: "Electrical" },
  { value: "Plumbing", label: "Plumbing" },
];
const INSPECTION_STATUS_OPTIONS = [
  { value: "Passed", label: "Passed" },
  { value: "Failed", label: "Failed" },
  { value: "Satisfactory", label: "Satisfactory" },
];
const CERT_NAME_OPTIONS = [
  { value: "Fire Safety Certificate", label: "Fire Safety Certificate" },
  { value: "Electrical Compliance", label: "Electrical Compliance" },
  { value: "Plumbing Certificate", label: "Plumbing Certificate" },
];
const CERT_STATUS_OPTIONS = [
  { value: "Valid", label: "Valid" },
  { value: "Expiring", label: "Expiring" },
  { value: "Expired", label: "Expired" },
];
const RISK_SEVERITY_OPTIONS = [
  { value: "Critical", label: "Critical" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];
const RISK_STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "Resolved", label: "Resolved" },
];
const TERRAIN_OPTIONS = [
  { value: "Flat", label: "Flat" },
  { value: "Rolling", label: "Rolling" },
  { value: "Hilly", label: "Hilly" },
  { value: "Mountainous", label: "Mountainous" },
  { value: "Mixed", label: "Mixed" },
];
const SUCCESSOR_RELATION_OPTIONS = [
  { value: "Spouse", label: "Spouse" },
  { value: "Child", label: "Child" },
  { value: "Sibling", label: "Sibling" },
  { value: "Parent", label: "Parent" },
  { value: "Other", label: "Other" },
];
const SUCCESSOR_ROLE_OPTIONS = [
  { value: "primary", label: "primary" },
  { value: "contingent", label: "contingent" },
];

const propertySelect = { field: "propertyId", label: "Property", editable: true, control: "select" as const, required: true, width: "180px" };

export const leaseColumns: ColumnConfig[] = [
  propertySelect,
  { field: "unit", label: "Unit", editable: true, control: "text", width: "100px" },
  { field: "stage", label: "Stage", editable: true, control: "select", required: true, options: LEASE_STAGE_OPTIONS },
  { field: "startDate", label: "Start", editable: true, control: "text", width: "110px" },
  { field: "endDate", label: "End", editable: true, control: "text", width: "110px" },
  { field: "monthlyRent", label: "Rent (USD)", editable: true, control: "number", width: "100px" },
  { field: "termMonths", label: "Term (mo)", editable: true, control: "number", width: "80px" },
  { field: "renewalStatus", label: "Renewal", editable: true, control: "text", width: "120px" },
];

export const paymentColumns: ColumnConfig[] = [
  propertySelect,
  { field: "date", label: "Date", editable: true, control: "text", width: "110px" },
  { field: "kind", label: "Kind", editable: true, control: "select", required: true, options: PAYMENT_KIND_OPTIONS },
  { field: "amount", label: "Amount (USD)", editable: true, control: "number", required: true, width: "110px" },
  { field: "method", label: "Method", editable: true, control: "select", required: true, options: PAYMENT_METHOD_OPTIONS },
  { field: "status", label: "Status", editable: true, control: "select", required: true, options: PAYMENT_STATUS_OPTIONS },
];

export const expenseColumns: ColumnConfig[] = [
  propertySelect,
  { field: "date", label: "Date", editable: true, control: "text", width: "110px" },
  { field: "category", label: "Category", editable: true, control: "select", required: true, options: EXPENSE_CATEGORY_OPTIONS },
  { field: "amount", label: "Amount (USD)", editable: true, control: "number", required: true, width: "110px" },
  { field: "note", label: "Note", editable: true, control: "text", width: "180px" },
];

export const coOwnerColumns: ColumnConfig[] = [
  propertySelect,
  { field: "name", label: "Name", editable: true, control: "text", required: true, width: "160px" },
  { field: "role", label: "Role", editable: true, control: "select", required: true, options: CO_OWNER_ROLE_OPTIONS },
  { field: "sharePercent", label: "Share %", editable: true, control: "number", width: "80px" },
  { field: "email", label: "Email", editable: true, control: "text", width: "160px" },
  { field: "phone", label: "Phone", editable: true, control: "text", width: "120px" },
  { field: "taxEntity", label: "Tax Entity", editable: true, control: "select", options: TAX_ENTITY_OPTIONS },
];

export const maintenanceColumns: ColumnConfig[] = [
  propertySelect,
  { field: "severity", label: "Severity", editable: true, control: "select", required: true, options: MAINTENANCE_SEVERITY_OPTIONS },
  { field: "title", label: "Title", editable: true, control: "text", required: true, width: "200px" },
  { field: "status", label: "Status", editable: true, control: "select", required: true, options: MAINTENANCE_STATUS_OPTIONS },
  { field: "cost", label: "Cost (USD)", editable: true, control: "number", width: "100px" },
];

export const inspectionColumns: ColumnConfig[] = [
  propertySelect,
  { field: "type", label: "Type", editable: true, control: "select", required: true, options: INSPECTION_TYPE_OPTIONS },
  { field: "inspector", label: "Inspector", editable: true, control: "text", required: true, width: "140px" },
  { field: "status", label: "Status", editable: true, control: "select", required: true, options: INSPECTION_STATUS_OPTIONS },
  { field: "inspectedAt", label: "Date", editable: true, control: "text", width: "110px" },
  { field: "issues", label: "Issues", editable: true, control: "number", width: "70px" },
];

export const certificationColumns: ColumnConfig[] = [
  propertySelect,
  { field: "name", label: "Name", editable: true, control: "select", required: true, options: CERT_NAME_OPTIONS },
  { field: "status", label: "Status", editable: true, control: "select", required: true, options: CERT_STATUS_OPTIONS },
  { field: "issuedAt", label: "Issued", editable: true, control: "text", width: "110px" },
  { field: "expiresAt", label: "Expires", editable: true, control: "text", width: "110px" },
  { field: "inspector", label: "Inspector", editable: true, control: "text", width: "140px" },
];

export const safetyRiskColumns: ColumnConfig[] = [
  propertySelect,
  { field: "severity", label: "Severity", editable: true, control: "select", required: true, options: RISK_SEVERITY_OPTIONS },
  { field: "title", label: "Title", editable: true, control: "text", required: true, width: "200px" },
  { field: "description", label: "Description", editable: true, control: "text", width: "250px" },
  { field: "status", label: "Status", editable: true, control: "select", options: RISK_STATUS_OPTIONS },
];

export const emergencyContactColumns: ColumnConfig[] = [
  propertySelect,
  { field: "name", label: "Name", editable: true, control: "text", required: true, width: "160px" },
  { field: "phone", label: "Phone", editable: true, control: "text", required: true, width: "120px" },
  { field: "sub", label: "Role", editable: true, control: "text", width: "140px" },
];

export const successorColumns: ColumnConfig[] = [
  { field: "name", label: "Name", editable: true, control: "text", required: true, width: "160px" },
  { field: "relation", label: "Relation", editable: true, control: "select", required: true, options: SUCCESSOR_RELATION_OPTIONS },
  { field: "role", label: "Role", editable: true, control: "select", required: true, options: SUCCESSOR_ROLE_OPTIONS },
  { field: "share", label: "Share", editable: true, control: "number", width: "80px" },
  { field: "email", label: "Email", editable: true, control: "text", width: "160px" },
  { field: "phone", label: "Phone", editable: true, control: "text", width: "120px" },
];

export const landParcelColumns: ColumnConfig[] = [
  propertySelect,
  { field: "sizeM2", label: "Size m²", editable: true, control: "number", required: true, width: "90px" },
  { field: "widthM", label: "Width m", editable: true, control: "number", width: "80px" },
  { field: "lengthM", label: "Length m", editable: true, control: "number", width: "80px" },
  { field: "zoningCode", label: "Zoning", editable: true, control: "text", width: "80px" },
  { field: "zoningClass", label: "Class", editable: true, control: "text", width: "120px" },
  { field: "terrainType", label: "Terrain", editable: true, control: "select", options: TERRAIN_OPTIONS },
];

export const allColumnConfigs: Record<EntityType, ColumnConfig[]> = {
  properties: propertyColumns,
  tenants: tenantColumns,
  valuations: valuationColumns,
  leases: leaseColumns,
  payments: paymentColumns,
  expenses: expenseColumns,
  coOwners: coOwnerColumns,
  maintenance: maintenanceColumns,
  inspections: inspectionColumns,
  certifications: certificationColumns,
  safetyRisks: safetyRiskColumns,
  emergencyContacts: emergencyContactColumns,
  successors: successorColumns,
  landParcels: landParcelColumns,
};
