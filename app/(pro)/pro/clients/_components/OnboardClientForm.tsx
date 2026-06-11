"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { onboardClient } from "@/app/(pro)/pro/actions";

// Onboarding form for a new owner-client. Submits the real
// onboardClient server action (creates the Client record and assigns
// the selected unassigned properties to it), then refreshes the route
// so every rollup re-derives.

export function OnboardClientForm({
  unassignedProperties,
  onDone,
}: {
  unassignedProperties: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [clientType, setClientType] = useState<"Individual" | "Corporate">(
    "Individual",
  );
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [feePct, setFeePct] = useState("10");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

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
        name,
        clientType,
        email: email.trim() === "" ? undefined : email.trim(),
        phone: phone.trim() === "" ? undefined : phone.trim(),
        managementFeePct: Number.isFinite(parsedFee) ? parsedFee : undefined,
        propertyIds: selectedPropertyIds,
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
        New client
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          Name
          <input
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Sokha Family Office"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          Type
          <select
            value={clientType}
            onChange={(event) =>
              setClientType(event.target.value as "Individual" | "Corporate")
            }
            className={inputClass}
          >
            <option value="Individual">Individual</option>
            <option value="Corporate">Corporate</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          Email (optional)
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@example.com"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          Phone (optional)
          <input
            type="text"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+855 …"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          Management fee (% of collected rent)
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={feePct}
            onChange={(event) => setFeePct(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {unassignedProperties.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
            Assign unassigned properties (optional)
          </span>
          <div className="flex flex-wrap gap-2">
            {unassignedProperties.map((property) => {
              const selected = selectedPropertyIds.includes(property.id);
              return (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => togglePropertySelection(property.id)}
                  className={
                    selected
                      ? "rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-[12px] font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                      : "rounded-full border border-slate-200 px-3 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  }
                >
                  {property.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          {isPending ? "Creating…" : "Create client"}
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
