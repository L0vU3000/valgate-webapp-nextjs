"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkOrder } from "@/app/(pro)/pro/actions";
import type { WorkOrdersPageData } from "@/app/(pro)/pro/queries";

// Inline form to open a new work order against any active property,
// with optional vendor pre-assignment and cost estimate. Writes
// through the real createWorkOrder server action.

export function NewWorkOrderForm({
  properties,
  vendors,
  onDone,
}: {
  properties: WorkOrdersPageData["properties"];
  vendors: WorkOrdersPageData["vendors"];
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState("");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"Emergency" | "Urgent" | "Standard">(
    "Standard",
  );
  const [vendorId, setVendorId] = useState("");
  const [cost, setCost] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedCost = Number(cost);

    startTransition(async () => {
      const result = await createWorkOrder({
        propertyId,
        title,
        severity,
        vendorId: vendorId === "" ? undefined : vendorId,
        cost: cost.trim() !== "" && Number.isFinite(parsedCost) ? parsedCost : undefined,
      });

      if (result.ok) {
        router.refresh();
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  const inputClass =
    "h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
        New work order
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          Property
          <select
            required
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
            className={inputClass}
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
        </label>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          Severity
          <select
            value={severity}
            onChange={(event) =>
              setSeverity(
                event.target.value as "Emergency" | "Urgent" | "Standard",
              )
            }
            className={inputClass}
          >
            <option value="Standard">Standard</option>
            <option value="Urgent">Urgent</option>
            <option value="Emergency">Emergency</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
          Description
          <input
            type="text"
            required
            minLength={3}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Water heater not working — Unit 2A"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          Vendor (optional)
          <select
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
            className={inputClass}
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
        </label>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          Estimated cost (optional, USD)
          <input
            type="number"
            min={0}
            step={10}
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            placeholder="e.g. 250"
            className={inputClass}
          />
        </label>
      </div>

      {error && (
        <p className="text-[12.5px] font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create work order"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-9 items-center rounded-md border border-slate-200 px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
