"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Check } from "lucide-react";
import { updateWorkOrder } from "@/app/(pro)/pro/properties.actions";
import { cn } from "@/components/ui/utils";
import {
  ProModal,
  ProField,
  ProFormError,
  ProModalActions,
  ProModalSuccess,
  proInputClass,
} from "@/app/(pro)/pro/_components/pro-modal";
import type {
  ProWorkOrderRow,
  WorkOrdersPageData,
} from "@/app/(pro)/pro/queries";

type Vendor = WorkOrdersPageData["vendors"][number];

// Assign (or reassign) a vendor to a work order from the Professional
// directory. Replaces the bare inline <select> with a picker that shows
// each vendor's company, category, rating and availability, plus an
// optional cost estimate captured at dispatch time. Writes through the
// real updateWorkOrder server action.

export function AssignVendorModal({
  workOrder,
  vendors,
  onClose,
}: {
  // The work order to assign. `null` means the modal is closed.
  workOrder: ProWorkOrderRow | null;
  vendors: Vendor[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Keep the last work order rendered through the close animation.
  const [snapshot, setSnapshot] = useState<ProWorkOrderRow | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [cost, setCost] = useState("");

  useEffect(() => {
    if (workOrder) {
      setSnapshot(workOrder);
      // Pre-select the currently assigned vendor and existing estimate.
      setSelectedVendorId(workOrder.vendorId ?? "");
      setCost(workOrder.cost !== undefined ? String(workOrder.cost) : "");
      setError(null);
      setShowSuccess(false);
    }
  }, [workOrder]);

  const open = workOrder !== null;
  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!snapshot || selectedVendorId === "") return;
    setError(null);

    const parsedCost = Number(cost);
    const costToSend =
      cost.trim() !== "" && Number.isFinite(parsedCost) && parsedCost >= 0
        ? parsedCost
        : undefined;

    startTransition(async () => {
      const result = await updateWorkOrder({
        id: snapshot.id,
        vendorId: selectedVendorId,
        cost: costToSend,
      });

      if (result.ok) {
        router.refresh();
        setShowSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <ProModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Assign a vendor"
      description={
        snapshot
          ? `Dispatch "${snapshot.title}" to a professional from your directory.`
          : "Dispatch this work order to a professional."
      }
    >
      {!snapshot ? null : showSuccess ? (
        <ProModalSuccess
          message={
            selectedVendor
              ? `Assigned to ${selectedVendor.name}`
              : "Vendor assigned"
          }
          onComplete={onClose}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Work order context */}
          <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[12.5px] dark:border-slate-800 dark:bg-slate-800/40">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {snapshot.propertyName}
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              {snapshot.clientName} · {snapshot.severity}
            </div>
          </div>

          {/* Vendor picker */}
          <ProField label="Vendor">
            <div className="-mx-1 flex max-h-64 flex-col gap-1.5 overflow-y-auto px-1">
              {vendors.map((vendor) => (
                <VendorOption
                  key={vendor.id}
                  vendor={vendor}
                  selected={vendor.id === selectedVendorId}
                  onSelect={() => setSelectedVendorId(vendor.id)}
                />
              ))}
            </div>
          </ProField>

          <ProField
            label="Estimated cost"
            htmlFor="assign-cost"
            hint="USD · optional"
          >
            <input
              id="assign-cost"
              type="number"
              min={0}
              step={10}
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="e.g. 250"
              className={proInputClass}
            />
          </ProField>

          <ProFormError message={error} />

          <ProModalActions
            onCancel={onClose}
            submitLabel="Assign vendor"
            pendingLabel="Assigning…"
            isPending={isPending}
            submitDisabled={selectedVendorId === ""}
          />
        </form>
      )}
    </ProModal>
  );
}

// One selectable vendor row in the picker. Unavailable vendors are
// dimmed and cannot be chosen (the server still owns the final rule).
function VendorOption({
  vendor,
  selected,
  onSelect,
}: {
  vendor: Vendor;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!vendor.available}
      aria-pressed={selected}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors",
        selected
          ? "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/15"
          : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60",
        !vendor.available && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
    >
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
          {vendor.name}
        </span>
        <span className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">
          {vendor.company} · {vendor.category}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {vendor.rating.toFixed(1)}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium",
            vendor.available
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
          )}
        >
          {vendor.available ? "Available" : "Busy"}
        </span>
        {selected && (
          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        )}
      </div>
    </button>
  );
}
