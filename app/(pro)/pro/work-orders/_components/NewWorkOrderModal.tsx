"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkOrder } from "@/app/(pro)/pro/actions";
import {
  ProModal,
  ProField,
  ProFormError,
  ProModalActions,
  ProModalSuccess,
  proInputClass,
  proSelectClass,
} from "@/app/(pro)/pro/_components/pro-modal";
import type { WorkOrdersPageData } from "@/app/(pro)/pro/queries";

// Open a new work order against any active property, with optional
// vendor pre-assignment and cost estimate. Writes through the real
// createWorkOrder server action. Self-contained modal.

export function NewWorkOrderModal({
  open,
  onOpenChange,
  properties,
  vendors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: WorkOrdersPageData["properties"];
  vendors: WorkOrdersPageData["vendors"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [propertyId, setPropertyId] = useState("");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"Emergency" | "Urgent" | "Standard">(
    "Standard",
  );
  const [vendorId, setVendorId] = useState("");
  const [cost, setCost] = useState("");

  function resetForm() {
    setPropertyId("");
    setTitle("");
    setSeverity("Standard");
    setVendorId("");
    setCost("");
    setError(null);
    setShowSuccess(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedCost = Number(cost);

    startTransition(async () => {
      const result = await createWorkOrder({
        propertyId,
        title: title.trim(),
        severity,
        vendorId: vendorId === "" ? undefined : vendorId,
        cost:
          cost.trim() !== "" && Number.isFinite(parsedCost)
            ? parsedCost
            : undefined,
      });

      if (result.ok) {
        router.refresh();
        setShowSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  // Mirror the server's Zod rules: a property must be chosen and the
  // description must be at least 3 characters.
  const canSubmit = propertyId !== "" && title.trim().length >= 3;

  return (
    <ProModal
      open={open}
      onOpenChange={handleOpenChange}
      title="New work order"
      description="Log a maintenance issue and route it to a vendor when you're ready."
    >
      {showSuccess ? (
        <ProModalSuccess
          message="Work order created"
          onComplete={() => handleOpenChange(false)}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProField
              label="Property"
              htmlFor="wo-property"
              className="sm:col-span-2"
            >
              <select
                id="wo-property"
                required
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
                className={proSelectClass}
              >
                <option value="" disabled>
                  Select a property…
                </option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} — {property.clientName}
                  </option>
                ))}
              </select>
            </ProField>

            <ProField
              label="Description"
              htmlFor="wo-title"
              className="sm:col-span-2"
            >
              <input
                id="wo-title"
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Water heater not working — Unit 2A"
                className={proInputClass}
              />
            </ProField>

            <ProField label="Severity" htmlFor="wo-severity">
              <select
                id="wo-severity"
                value={severity}
                onChange={(event) =>
                  setSeverity(
                    event.target.value as "Emergency" | "Urgent" | "Standard",
                  )
                }
                className={proSelectClass}
              >
                <option value="Standard">Standard</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </select>
            </ProField>

            <ProField
              label="Estimated cost"
              htmlFor="wo-cost"
              hint="USD · optional"
            >
              <input
                id="wo-cost"
                type="number"
                min={0}
                step={10}
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                placeholder="e.g. 250"
                className={proInputClass}
              />
            </ProField>

            <ProField
              label="Vendor"
              htmlFor="wo-vendor"
              hint="Assign now or later"
              className="sm:col-span-2"
            >
              <select
                id="wo-vendor"
                value={vendorId}
                onChange={(event) => setVendorId(event.target.value)}
                className={proSelectClass}
              >
                <option value="">Assign later</option>
                {vendors.map((vendor) => (
                  <option
                    key={vendor.id}
                    value={vendor.id}
                    disabled={!vendor.available}
                  >
                    {vendor.name} — {vendor.category}
                    {vendor.available ? "" : " (unavailable)"}
                  </option>
                ))}
              </select>
            </ProField>
          </div>

          <ProFormError message={error} />

          <ProModalActions
            onCancel={() => handleOpenChange(false)}
            submitLabel="Create work order"
            pendingLabel="Creating…"
            isPending={isPending}
            submitDisabled={!canSubmit}
          />
        </form>
      )}
    </ProModal>
  );
}
