"use client";

import { useState, useTransition } from "react";
import { ProModal, ProField, ProFormError, ProModalActions, ProModalSuccess, proSelectClass } from "@/app/(pro)/pro/_components/pro-modal";
import { assignProperties } from "@/app/(pro)/pro/actions";

type ClientOption = {
  id: string;
  name: string;
};

export function BulkAssignModal({
  open,
  onOpenChange,
  selectedPropertyIds,
  clients,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPropertyIds: string[];
  clients: ClientOption[];
  onComplete: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await assignProperties({
        clientId,
        propertyIds: selectedPropertyIds,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  function handleComplete() {
    setSuccess(false);
    setClientId("");
    onOpenChange(false);
    onComplete();
  }

  return (
    <ProModal
      open={open}
      onOpenChange={(o) => {
        if (!o && !isPending) {
          setSuccess(false);
          setClientId("");
          setError(null);
          onOpenChange(false);
        }
      }}
      title="Assign properties"
      description={`Assign ${selectedPropertyIds.length} ${selectedPropertyIds.length === 1 ? "property" : "properties"} to a client portfolio`}
    >
      {success ? (
        <ProModalSuccess
          message={`${selectedPropertyIds.length} ${selectedPropertyIds.length === 1 ? "property has" : "properties have"} been assigned.`}
          onComplete={handleComplete}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Selection count chip — same pill style as CSV review chips */}
          <div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-medium text-slate-600">
              {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? "property" : "properties"} selected
            </span>
          </div>

          <ProField label="Client portfolio">
            <select
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); setError(null); }}
              className={proSelectClass}
              autoFocus
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </ProField>

          <ProFormError message={error} />

          <ProModalActions
            onCancel={() => onOpenChange(false)}
            submitLabel="Assign"
            pendingLabel="Assigning…"
            isPending={isPending}
            submitDisabled={!clientId}
          />
        </form>
      )}
    </ProModal>
  );
}
