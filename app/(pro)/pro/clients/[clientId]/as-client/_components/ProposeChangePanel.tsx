"use client";
// Manager "Propose changes" side panel (Pro-3.0). Covers all Tier 1 entities
// (property, lease, tenant, payment) across all operations (add / edit / remove).
// Rendered by ClientPreviewShell so it persists across preview section navigation.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check, AlertTriangle } from "lucide-react";
import type { Property } from "@/lib/data/types/property";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";
import { proposeChangeAction } from "@/app/(pro)/pro/change-requests.actions";
import { toast } from "sonner";

// ─── Shared styles ────────────────────────────────────────────────────────────

const INPUT = "w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all";
const LABEL = "block text-[12px] font-semibold text-slate-600 mb-1";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityType = "property" | "lease" | "tenant" | "payment";
type OperationType = "update" | "create" | "delete";

const ENTITY_LABELS: Record<EntityType, string> = {
  property: "Property",
  lease: "Lease",
  tenant: "Tenant",
  payment: "Payment",
};

const OP_LABELS: Record<OperationType, string> = {
  create: "Add",
  update: "Edit",
  delete: "Remove",
};

// ─── Lease form ───────────────────────────────────────────────────────────────

type LeaseForm = {
  propertyId: string;
  unit: string;
  stage: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  termMonths: string;
};

const EMPTY_LEASE_FORM: LeaseForm = {
  propertyId: "",
  unit: "",
  stage: "Approaching",
  startDate: "",
  endDate: "",
  monthlyRent: "",
  termMonths: "",
};

// Converts a timestamp field (string, number, or Date) to a yyyy-mm-dd input value.
function toDateInput(d: string | number | Date): string {
  return new Date(d as number).toISOString().slice(0, 10);
}

function initLeaseForm(lease: Lease): LeaseForm {
  return {
    propertyId: lease.propertyId,
    unit: lease.unit,
    stage: lease.stage,
    startDate: toDateInput(lease.startDate),
    endDate: toDateInput(lease.endDate),
    monthlyRent: String(lease.monthlyRent),
    termMonths: String(lease.termMonths),
  };
}

function buildLeasePatch(form: LeaseForm, operation: OperationType): Record<string, unknown> {
  // For "create", include all required fields; for "update", include non-empty ones.
  if (operation === "create") {
    return {
      propertyId: form.propertyId,
      unit: form.unit,
      stage: form.stage,
      startDate: form.startDate,
      endDate: form.endDate,
      monthlyRent: form.monthlyRent ? Number(form.monthlyRent) : 0,
      termMonths: form.termMonths ? Number(form.termMonths) : 1,
    };
  }
  // update: include only non-empty changed fields
  const patch: Record<string, unknown> = {};
  if (form.unit.trim()) patch.unit = form.unit.trim();
  if (form.stage) patch.stage = form.stage;
  if (form.startDate) patch.startDate = form.startDate;
  if (form.endDate) patch.endDate = form.endDate;
  if (form.monthlyRent.trim()) patch.monthlyRent = Number(form.monthlyRent);
  if (form.termMonths.trim()) patch.termMonths = Number(form.termMonths);
  return patch;
}

function LeaseFormFields({
  form,
  onChange,
  properties,
  showPropertyPicker,
}: {
  form: LeaseForm;
  onChange: (key: keyof LeaseForm, value: string) => void;
  properties: Property[];
  showPropertyPicker: boolean;
}) {
  return (
    <div className="space-y-3">
      {showPropertyPicker && (
        <div>
          <label className={LABEL} htmlFor="lf-propertyId">Property</label>
          <select id="lf-propertyId" value={form.propertyId} onChange={(e) => onChange("propertyId", e.target.value)} className={INPUT}>
            <option value="">— select property —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className={LABEL} htmlFor="lf-unit">Unit</label>
        <input id="lf-unit" type="text" value={form.unit} onChange={(e) => onChange("unit", e.target.value)} placeholder="e.g. Unit 3A" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="lf-stage">Stage</label>
        <select id="lf-stage" value={form.stage} onChange={(e) => onChange("stage", e.target.value)} className={INPUT}>
          {["Approaching", "Offered", "Signed", "Declined"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="lf-start">Start date</label>
          <input id="lf-start" type="date" value={form.startDate} onChange={(e) => onChange("startDate", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="lf-end">End date</label>
          <input id="lf-end" type="date" value={form.endDate} onChange={(e) => onChange("endDate", e.target.value)} className={INPUT} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="lf-rent">Monthly rent ($)</label>
          <input id="lf-rent" type="number" value={form.monthlyRent} onChange={(e) => onChange("monthlyRent", e.target.value)} placeholder="0" className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="lf-term">Term (months)</label>
          <input id="lf-term" type="number" value={form.termMonths} onChange={(e) => onChange("termMonths", e.target.value)} placeholder="12" className={INPUT} />
        </div>
      </div>
    </div>
  );
}

// ─── Tenant form ──────────────────────────────────────────────────────────────

type TenantForm = {
  propertyId: string;
  name: string;
  unit: string;
  rent: string;
  status: string;
  email: string;
  phone: string;
};

const EMPTY_TENANT_FORM: TenantForm = {
  propertyId: "",
  name: "",
  unit: "",
  rent: "",
  status: "Pending",
  email: "",
  phone: "",
};

function initTenantForm(tenant: Tenant): TenantForm {
  return {
    propertyId: tenant.propertyId,
    name: tenant.name,
    unit: tenant.unit,
    rent: String(tenant.rent),
    status: tenant.status,
    email: tenant.email ?? "",
    phone: tenant.phone ?? "",
  };
}

function buildTenantPatch(form: TenantForm, operation: OperationType): Record<string, unknown> {
  if (operation === "create") {
    const patch: Record<string, unknown> = {
      propertyId: form.propertyId,
      name: form.name,
      unit: form.unit,
      rent: form.rent ? Number(form.rent) : 0,
      status: form.status,
    };
    if (form.email.trim()) patch.email = form.email.trim();
    if (form.phone.trim()) patch.phone = form.phone.trim();
    return patch;
  }
  const patch: Record<string, unknown> = {};
  if (form.name.trim()) patch.name = form.name.trim();
  if (form.unit.trim()) patch.unit = form.unit.trim();
  if (form.rent.trim()) patch.rent = Number(form.rent);
  if (form.status) patch.status = form.status;
  if (form.email.trim()) patch.email = form.email.trim();
  if (form.phone.trim()) patch.phone = form.phone.trim();
  return patch;
}

function TenantFormFields({
  form,
  onChange,
  properties,
  showPropertyPicker,
}: {
  form: TenantForm;
  onChange: (key: keyof TenantForm, value: string) => void;
  properties: Property[];
  showPropertyPicker: boolean;
}) {
  return (
    <div className="space-y-3">
      {showPropertyPicker && (
        <div>
          <label className={LABEL} htmlFor="tf-propertyId">Property</label>
          <select id="tf-propertyId" value={form.propertyId} onChange={(e) => onChange("propertyId", e.target.value)} className={INPUT}>
            <option value="">— select property —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className={LABEL} htmlFor="tf-name">Full name</label>
        <input id="tf-name" type="text" value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. Sokha Chum" className={INPUT} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="tf-unit">Unit</label>
          <input id="tf-unit" type="text" value={form.unit} onChange={(e) => onChange("unit", e.target.value)} placeholder="e.g. Unit 1" className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="tf-rent">Monthly rent ($)</label>
          <input id="tf-rent" type="number" value={form.rent} onChange={(e) => onChange("rent", e.target.value)} placeholder="0" className={INPUT} />
        </div>
      </div>
      <div>
        <label className={LABEL} htmlFor="tf-status">Payment status</label>
        <select id="tf-status" value={form.status} onChange={(e) => onChange("status", e.target.value)} className={INPUT}>
          {["Paid", "Overdue", "Pending"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL} htmlFor="tf-email">Email (optional)</label>
        <input id="tf-email" type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} placeholder="tenant@email.com" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="tf-phone">Phone (optional)</label>
        <input id="tf-phone" type="tel" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="+1 555 0100" className={INPUT} />
      </div>
    </div>
  );
}

// ─── Payment form ─────────────────────────────────────────────────────────────

type PaymentForm = {
  leaseId: string;
  date: string;
  kind: string;
  amount: string;
  method: string;
  status: string;
};

const EMPTY_PAYMENT_FORM: PaymentForm = {
  leaseId: "",
  date: "",
  kind: "Rent",
  amount: "",
  method: "Cash",
  status: "Pending",
};

function initPaymentForm(payment: Payment): PaymentForm {
  return {
    leaseId: payment.leaseId ?? "",
    date: toDateInput(payment.date),
    kind: payment.kind,
    amount: String(payment.amount),
    method: payment.method,
    status: payment.status,
  };
}

function buildPaymentPatch(form: PaymentForm, operation: OperationType): Record<string, unknown> {
  if (operation === "create") {
    const patch: Record<string, unknown> = {
      date: form.date,
      kind: form.kind,
      amount: form.amount ? Number(form.amount) : 0,
      method: form.method,
      status: form.status,
    };
    if (form.leaseId) patch.leaseId = form.leaseId;
    return patch;
  }
  const patch: Record<string, unknown> = {};
  if (form.date) patch.date = form.date;
  if (form.kind) patch.kind = form.kind;
  if (form.amount.trim()) patch.amount = Number(form.amount);
  if (form.method) patch.method = form.method;
  if (form.status) patch.status = form.status;
  if (form.leaseId) patch.leaseId = form.leaseId;
  return patch;
}

function PaymentFormFields({
  form,
  onChange,
  leases,
}: {
  form: PaymentForm;
  onChange: (key: keyof PaymentForm, value: string) => void;
  leases: Lease[];
}) {
  return (
    <div className="space-y-3">
      {leases.length > 0 && (
        <div>
          <label className={LABEL} htmlFor="pf-leaseId">Lease (optional)</label>
          <select id="pf-leaseId" value={form.leaseId} onChange={(e) => onChange("leaseId", e.target.value)} className={INPUT}>
            <option value="">— no lease —</option>
            {leases.map((l) => (
              <option key={l.id} value={l.id}>
                {l.unit} · {l.stage}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className={LABEL} htmlFor="pf-date">Date</label>
        <input id="pf-date" type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)} className={INPUT} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="pf-kind">Kind</label>
          <select id="pf-kind" value={form.kind} onChange={(e) => onChange("kind", e.target.value)} className={INPUT}>
            {["Rent", "Fee", "Deposit", "Refund"].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="pf-amount">Amount ($)</label>
          <input id="pf-amount" type="number" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} placeholder="0" className={INPUT} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="pf-method">Method</label>
          <select id="pf-method" value={form.method} onChange={(e) => onChange("method", e.target.value)} className={INPUT}>
            {["ABA Bank", "Wing", "Wire transfer", "Cash"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="pf-status">Status</label>
          <select id="pf-status" value={form.status} onChange={(e) => onChange("status", e.target.value)} className={INPUT}>
            {["Paid", "Pending", "Failed", "Overdue"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Property form ────────────────────────────────────────────────────────────

const PROPERTY_STATUSES = [
  "Rented", "Vacant", "For Sale", "Sold", "Archived", "Owner-Occupied",
] as const;

type PropertyForm = {
  name: string;
  status: string;
  addressLine: string;
  city: string;
  province: string;
  currentMarketValue: string;
  totalArea: string;
};

const EMPTY_PROPERTY_FORM: PropertyForm = {
  name: "",
  status: "",
  addressLine: "",
  city: "",
  province: "",
  currentMarketValue: "",
  totalArea: "",
};

function initPropertyForm(p: Property): PropertyForm {
  return {
    name: p.name ?? "",
    status: p.status ?? "",
    addressLine: p.addressLine ?? "",
    city: p.city ?? "",
    province: p.province ?? "",
    currentMarketValue: p.currentMarketValue != null ? String(p.currentMarketValue) : "",
    totalArea: p.totalArea ?? "",
  };
}

// Only include fields that actually differ from the original.
function buildPropertyPatch(form: PropertyForm, original: Property): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (form.name.trim() && form.name.trim() !== original.name) patch.name = form.name.trim();
  if (form.status && form.status !== original.status) patch.status = form.status;
  if (form.addressLine !== (original.addressLine ?? "")) patch.addressLine = form.addressLine;
  if (form.city !== (original.city ?? "")) patch.city = form.city;
  if (form.province !== (original.province ?? "")) patch.province = form.province;
  const numVal = form.currentMarketValue ? Number(form.currentMarketValue.replace(/[$,\s]/g, "")) : null;
  if (numVal != null && Number.isFinite(numVal) && numVal !== original.currentMarketValue) {
    patch.currentMarketValue = numVal;
  }
  if (form.totalArea.trim() && form.totalArea.trim() !== (original.totalArea ?? "")) {
    patch.totalArea = form.totalArea.trim();
  }
  return patch;
}

function PropertyFormFields({ form, onChange }: { form: PropertyForm; onChange: (k: keyof PropertyForm, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={LABEL} htmlFor="cr-status">Status</label>
        <select id="cr-status" value={form.status} onChange={(e) => onChange("status", e.target.value)} className={INPUT}>
          {PROPERTY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL} htmlFor="cr-name">Property name</label>
        <input id="cr-name" type="text" value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. Sunset Villa" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="cr-address">Address line</label>
        <input id="cr-address" type="text" value={form.addressLine} onChange={(e) => onChange("addressLine", e.target.value)} placeholder="Street address" className={INPUT} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="cr-city">City</label>
          <input id="cr-city" type="text" value={form.city} onChange={(e) => onChange("city", e.target.value)} placeholder="City" className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="cr-province">Province</label>
          <input id="cr-province" type="text" value={form.province} onChange={(e) => onChange("province", e.target.value)} placeholder="Province" className={INPUT} />
        </div>
      </div>
      <div>
        <label className={LABEL} htmlFor="cr-value">Market value</label>
        <input id="cr-value" type="text" value={form.currentMarketValue} onChange={(e) => onChange("currentMarketValue", e.target.value)} placeholder="e.g. 250000" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="cr-area">Total area</label>
        <input id="cr-area" type="text" value={form.totalArea} onChange={(e) => onChange("totalArea", e.target.value)} placeholder="e.g. 120 sqm" className={INPUT} />
      </div>
    </div>
  );
}

// ─── Propose-changes panel ────────────────────────────────────────────────────

type ProposePanelProps = {
  clientId: string;
  // Full-grant manager → the same forms apply directly (auto-approved) instead of proposing.
  // The write path is chosen SERVER-SIDE from the real grant; this prop only drives copy.
  canWrite: boolean;
  properties: Property[];
  leases: Lease[];
  tenants: Tenant[];
  payments: Payment[];
  onClose: () => void;
};

export function ProposeChangePanel({ clientId, canWrite, properties, leases, tenants, payments, onClose }: ProposePanelProps) {
  const router = useRouter();
  const [entityType, setEntityType] = useState<EntityType>("property");
  const [operation, setOperation] = useState<OperationType>("update");
  const [isPending, startTransition] = useTransition();

  // Entity selectors (for edit/remove operations — which existing row to act on).
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id ?? "");
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>(leases[0]?.id ?? "");
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id ?? "");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(payments[0]?.id ?? "");

  // Per-entity form state.
  const [propertyForm, setPropertyForm] = useState<PropertyForm>(
    properties[0] ? initPropertyForm(properties[0]) : EMPTY_PROPERTY_FORM,
  );
  const [leaseForm, setLeaseForm] = useState<LeaseForm>(
    leases[0] ? initLeaseForm(leases[0]) : { ...EMPTY_LEASE_FORM, propertyId: properties[0]?.id ?? "" },
  );
  const [tenantForm, setTenantForm] = useState<TenantForm>(
    tenants[0] ? initTenantForm(tenants[0]) : { ...EMPTY_TENANT_FORM, propertyId: properties[0]?.id ?? "" },
  );
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(
    payments[0] ? initPaymentForm(payments[0]) : { ...EMPTY_PAYMENT_FORM, leaseId: leases[0]?.id ?? "" },
  );

  // ── Entity selector handlers (sync form state on selection change) ──

  function handlePropertySelect(id: string) {
    setSelectedPropertyId(id);
    const p = properties.find((x) => x.id === id);
    if (p) setPropertyForm(initPropertyForm(p));
  }

  function handleLeaseSelect(id: string) {
    setSelectedLeaseId(id);
    const l = leases.find((x) => x.id === id);
    if (l) setLeaseForm(initLeaseForm(l));
  }

  function handleTenantSelect(id: string) {
    setSelectedTenantId(id);
    const t = tenants.find((x) => x.id === id);
    if (t) setTenantForm(initTenantForm(t));
  }

  function handlePaymentSelect(id: string) {
    setSelectedPaymentId(id);
    const p = payments.find((x) => x.id === id);
    if (p) setPaymentForm(initPaymentForm(p));
  }

  // ── Entity type switch: reset operation to "update" if switching entity ──

  function handleEntityTypeChange(type: EntityType) {
    setEntityType(type);
    // Reset to update by default — safest starting operation.
    setOperation("update");
  }

  // ── Submit ──

  function handleSubmit() {
    startTransition(async () => {
      let patch: Record<string, unknown> = {};
      let entityId: string | null = null;

      if (entityType === "property") {
        const selected = properties.find((p) => p.id === selectedPropertyId);
        if (operation === "delete") {
          entityId = selectedPropertyId || null;
          patch = {};
        } else if (operation === "create") {
          patch = buildPropertyPatch(propertyForm, {} as Property);
          entityId = null;
        } else {
          // update
          if (!selected) { toast.error("Select a property to propose changes for."); return; }
          patch = buildPropertyPatch(propertyForm, selected);
          entityId = selected.id;
          if (Object.keys(patch).length === 0) { toast.warning("No changes detected — update at least one field."); return; }
        }

      } else if (entityType === "lease") {
        if (operation === "create") {
          patch = buildLeasePatch(leaseForm, "create");
          entityId = null;
        } else if (operation === "delete") {
          entityId = selectedLeaseId || null;
          patch = {};
        } else {
          entityId = selectedLeaseId || null;
          patch = buildLeasePatch(leaseForm, "update");
          if (Object.keys(patch).length === 0) { toast.warning("No changes detected — update at least one field."); return; }
        }

      } else if (entityType === "tenant") {
        if (operation === "create") {
          patch = buildTenantPatch(tenantForm, "create");
          entityId = null;
        } else if (operation === "delete") {
          entityId = selectedTenantId || null;
          patch = {};
        } else {
          entityId = selectedTenantId || null;
          patch = buildTenantPatch(tenantForm, "update");
          if (Object.keys(patch).length === 0) { toast.warning("No changes detected — update at least one field."); return; }
        }

      } else {
        // payment
        if (operation === "create") {
          patch = buildPaymentPatch(paymentForm, "create");
          entityId = null;
        } else if (operation === "delete") {
          entityId = selectedPaymentId || null;
          patch = {};
        } else {
          entityId = selectedPaymentId || null;
          patch = buildPaymentPatch(paymentForm, "update");
          if (Object.keys(patch).length === 0) { toast.warning("No changes detected — update at least one field."); return; }
        }
      }

      const result = await proposeChangeAction({
        clientId,
        entityType,
        entityId,
        operation,
        patch,
      });

      if (result.ok) {
        const opLabel = operation === "create" ? "addition" : operation === "delete" ? "removal" : "update";
        if (canWrite) {
          toast.success(`${ENTITY_LABELS[entityType]} ${opLabel} applied. The client has been notified.`);
          // Reflect the applied change in the preview without a full reload.
          router.refresh();
        } else {
          toast.success(`${ENTITY_LABELS[entityType]} ${opLabel} proposal submitted. The client will be notified.`);
        }
        onClose();
      } else {
        toast.error(result.error ?? "Failed to submit proposal. Please try again.");
      }
    });
  }

  // ── Entity row selector — shown for edit/remove to pick the target row ──

  function EntityRowSelector() {
    if (operation === "create") return null;

    if (entityType === "property") {
      if (properties.length === 0) return (
        <p className="text-[13px] text-slate-400 italic">No properties in this portfolio.</p>
      );
      return (
        <div>
          <label className={LABEL} htmlFor="er-property">Property</label>
          <select id="er-property" value={selectedPropertyId} onChange={(e) => handlePropertySelect(e.target.value)} className={INPUT}>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      );
    }

    if (entityType === "lease") {
      if (leases.length === 0) return (
        <p className="text-[13px] text-slate-400 italic">No leases in this portfolio.</p>
      );
      return (
        <div>
          <label className={LABEL} htmlFor="er-lease">Lease</label>
          <select id="er-lease" value={selectedLeaseId} onChange={(e) => handleLeaseSelect(e.target.value)} className={INPUT}>
            {leases.map((l) => (
              <option key={l.id} value={l.id}>{l.unit} · {l.stage}</option>
            ))}
          </select>
        </div>
      );
    }

    if (entityType === "tenant") {
      if (tenants.length === 0) return (
        <p className="text-[13px] text-slate-400 italic">No tenants in this portfolio.</p>
      );
      return (
        <div>
          <label className={LABEL} htmlFor="er-tenant">Tenant</label>
          <select id="er-tenant" value={selectedTenantId} onChange={(e) => handleTenantSelect(e.target.value)} className={INPUT}>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name} · {t.unit}</option>
            ))}
          </select>
        </div>
      );
    }

    // payment
    if (payments.length === 0) return (
      <p className="text-[13px] text-slate-400 italic">No payments in this portfolio.</p>
    );
    return (
      <div>
        <label className={LABEL} htmlFor="er-payment">Payment</label>
        <select id="er-payment" value={selectedPaymentId} onChange={(e) => handlePaymentSelect(e.target.value)} className={INPUT}>
          {payments.map((p) => (
            <option key={p.id} value={p.id}>
              {p.kind} · ${p.amount} · {p.status}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ── Delete confirmation card ──

  function DeleteConfirm() {
    let entityLabel = "";
    if (entityType === "property") {
      const p = properties.find((x) => x.id === selectedPropertyId);
      entityLabel = p?.name ?? selectedPropertyId;
    } else if (entityType === "lease") {
      const l = leases.find((x) => x.id === selectedLeaseId);
      entityLabel = l ? `${l.unit} (${l.stage})` : selectedLeaseId;
    } else if (entityType === "tenant") {
      const t = tenants.find((x) => x.id === selectedTenantId);
      entityLabel = t ? `${t.name} · ${t.unit}` : selectedTenantId;
    } else {
      const p = payments.find((x) => x.id === selectedPaymentId);
      entityLabel = p ? `${p.kind} · $${p.amount}` : selectedPaymentId;
    }

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-red-700">{canWrite ? "Remove entity" : "Propose removal"}</p>
            <p className="text-[12px] text-red-600 mt-0.5">
              <strong className="font-semibold">{entityLabel}</strong> will be permanently removed
              {canWrite ? " immediately" : " if the client approves"}. This cannot be undone.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Field form — shown for create and update operations ──

  function FieldForm() {
    if (operation === "delete") return null;

    if (entityType === "property") {
      return (
        <PropertyFormFields
          form={propertyForm}
          onChange={(k, v) => setPropertyForm((prev) => ({ ...prev, [k]: v }))}
        />
      );
    }

    if (entityType === "lease") {
      return (
        <LeaseFormFields
          form={leaseForm}
          onChange={(k, v) => setLeaseForm((prev) => ({ ...prev, [k]: v }))}
          properties={properties}
          showPropertyPicker={operation === "create"}
        />
      );
    }

    if (entityType === "tenant") {
      return (
        <TenantFormFields
          form={tenantForm}
          onChange={(k, v) => setTenantForm((prev) => ({ ...prev, [k]: v }))}
          properties={properties}
          showPropertyPicker={operation === "create"}
        />
      );
    }

    // payment
    return (
      <PaymentFormFields
        form={paymentForm}
        onChange={(k, v) => setPaymentForm((prev) => ({ ...prev, [k]: v }))}
        leases={leases}
      />
    );
  }

  // ── Determine if submit should be disabled ──
  const hasNoEntities = (
    (entityType === "property" && properties.length === 0) ||
    (entityType === "lease" && leases.length === 0 && operation !== "create") ||
    (entityType === "tenant" && tenants.length === 0 && operation !== "create") ||
    (entityType === "payment" && payments.length === 0 && operation !== "create")
  );

  return (
    <div className="fixed inset-y-0 right-0 z-[60] flex flex-col w-full max-w-md bg-white border-l border-slate-200 shadow-2xl">
      {/* Panel header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-blue-600" />
          <h2 className="text-[15px] font-semibold text-slate-800">{canWrite ? "Edit portfolio" : "Propose changes"}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Info banner */}
      <div className="shrink-0 mx-5 mt-4 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-[12px] text-blue-700">
        {canWrite
          ? "You have full access. Changes apply immediately to the client's portfolio, and the client is notified of each one."
          : "Your proposal will be sent to the client for review. No changes are applied until they approve."}
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Entity type selector */}
        <div>
          <p className={LABEL}>Entity type</p>
          <div className="flex gap-1.5 flex-wrap">
            {(["property", "lease", "tenant", "payment"] as EntityType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleEntityTypeChange(type)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  entityType === type
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {ENTITY_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Operation selector */}
        <div>
          <p className={LABEL}>Operation</p>
          <div className="flex gap-1.5">
            {(["update", "create", "delete"] as OperationType[]).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setOperation(op)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  operation === op
                    ? op === "delete"
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {OP_LABELS[op]}
              </button>
            ))}
          </div>
        </div>

        {/* Entity row selector (edit/remove) */}
        <EntityRowSelector />

        {/* Delete confirmation card */}
        {operation === "delete" && !hasNoEntities && <DeleteConfirm />}

        {/* Field form (create/edit) */}
        {!hasNoEntities && <FieldForm />}

      </div>

      {/* Footer: submit */}
      <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || hasNoEntities}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm active:scale-[0.98] disabled:opacity-50 transition-all ${
            operation === "delete"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Check className="h-4 w-4" />
          {isPending
            ? canWrite
              ? "Applying…"
              : "Submitting…"
            : canWrite
            ? operation === "delete"
              ? "Remove now"
              : operation === "create"
              ? `Add ${ENTITY_LABELS[entityType].toLowerCase()}`
              : "Save changes"
            : operation === "delete"
            ? "Submit removal proposal"
            : operation === "create"
            ? `Submit ${ENTITY_LABELS[entityType].toLowerCase()} proposal`
            : "Submit update proposal"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
