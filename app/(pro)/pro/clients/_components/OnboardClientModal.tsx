"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { onboardClient } from "@/app/(pro)/pro/actions";
import {
  ProModal,
  ProField,
  ProFormError,
  ProModalActions,
  ProModalSuccess,
  proInputClass,
  proSelectClass,
} from "@/app/(pro)/pro/_components/pro-modal";

// Onboard a new owner-client. Submits the real onboardClient server
// action (creates the Client record and assigns the selected unassigned
// properties to it), then refreshes so every rollup re-derives.
//
// Self-contained modal: the parent only owns the open/close boolean.

export function OnboardClientModal({
  open,
  onOpenChange,
  unassignedProperties,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unassignedProperties: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [name, setName] = useState("");
  const [clientType, setClientType] = useState<"Individual" | "Corporate">(
    "Individual",
  );
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [feePct, setFeePct] = useState("10");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  // Reset every field so the next time the modal opens it starts clean.
  function resetForm() {
    setName("");
    setClientType("Individual");
    setEmail("");
    setPhone("");
    setFeePct("10");
    setSelectedPropertyIds([]);
    setError(null);
    setShowSuccess(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function togglePropertySelection(propertyId: string) {
    setSelectedPropertyIds((current) =>
      current.includes(propertyId)
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId],
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedFee = Number(feePct);

    startTransition(async () => {
      const result = await onboardClient({
        name: name.trim(),
        clientType,
        email: email.trim() === "" ? undefined : email.trim(),
        phone: phone.trim() === "" ? undefined : phone.trim(),
        managementFeePct: Number.isFinite(parsedFee) ? parsedFee : undefined,
        propertyIds: selectedPropertyIds,
      });

      if (result.ok) {
        router.refresh();
        setShowSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  // Mirror the server's Zod rule (name min 2) so the primary button
  // only enables once the form can actually succeed.
  const nameIsValid = name.trim().length >= 2;

  return (
    <ProModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Onboard a client"
      description="Create an owner engagement and optionally hand it some unassigned properties."
    >
      {showSuccess ? (
        <ProModalSuccess
          message={`${name.trim() || "Client"} is now under management`}
          onComplete={() => handleOpenChange(false)}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProField label="Name" htmlFor="onboard-name" className="sm:col-span-2">
              <input
                id="onboard-name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Sokha Family Office"
                className={proInputClass}
              />
            </ProField>

            <ProField label="Type" htmlFor="onboard-type">
              <select
                id="onboard-type"
                value={clientType}
                onChange={(event) =>
                  setClientType(event.target.value as "Individual" | "Corporate")
                }
                className={proSelectClass}
              >
                <option value="Individual">Individual</option>
                <option value="Corporate">Corporate</option>
              </select>
            </ProField>

            <ProField
              label="Management fee"
              htmlFor="onboard-fee"
              hint="% of collected rent"
            >
              <input
                id="onboard-fee"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={feePct}
                onChange={(event) => setFeePct(event.target.value)}
                className={proInputClass}
              />
            </ProField>

            <ProField label="Email" htmlFor="onboard-email" hint="Optional">
              <input
                id="onboard-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@example.com"
                className={proInputClass}
              />
            </ProField>

            <ProField label="Phone" htmlFor="onboard-phone" hint="Optional">
              <input
                id="onboard-phone"
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+855 …"
                className={proInputClass}
              />
            </ProField>
          </div>

          {unassignedProperties.length > 0 && (
            <ProField
              label="Assign properties"
              hint={`${selectedPropertyIds.length} of ${unassignedProperties.length} selected · optional`}
            >
              <div className="flex flex-wrap gap-2">
                {unassignedProperties.map((property) => {
                  const selected = selectedPropertyIds.includes(property.id);
                  return (
                    <button
                      key={property.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => togglePropertySelection(property.id)}
                      className={
                        selected
                          ? "rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-[12px] font-medium text-blue-700 transition-colors dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                          : "rounded-full border border-slate-200 px-3 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      }
                    >
                      {property.name}
                    </button>
                  );
                })}
              </div>
            </ProField>
          )}

          <ProFormError message={error} />

          <ProModalActions
            onCancel={() => handleOpenChange(false)}
            submitLabel="Create client"
            pendingLabel="Creating…"
            isPending={isPending}
            submitDisabled={!nameIsValid}
          />
        </form>
      )}
    </ProModal>
  );
}
