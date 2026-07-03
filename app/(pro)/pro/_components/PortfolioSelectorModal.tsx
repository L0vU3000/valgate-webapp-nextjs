"use client";

import { useState } from "react";
import { Search, Plus, Building2, User } from "lucide-react";
import { ProModal } from "./pro-modal";
import { proInputClass, proPrimaryButtonClass, proSecondaryButtonClass } from "./pro-modal";

type ClientOption = {
  id: string;
  name: string;
};

export function PortfolioSelectorModal({
  open,
  onOpenChange,
  clients,
  onSelect,
  onCreateNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  onSelect: (clientId: string) => void;
  onCreateNew: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ProModal
      open={open}
      onOpenChange={onOpenChange}
      title="Select a client portfolio"
      description="Choose which client's portfolio to add this property to"
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className={`${proInputClass} pl-8`}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto -mx-2 px-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate-400">
              {search ? "No clients match this search." : "No clients yet."}
            </p>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => onSelect(client.id)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <span className="font-medium">{client.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onCreateNew}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
          >
            <Plus className="h-4 w-4" />
            Onboard a new client
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={proSecondaryButtonClass}
          >
            Cancel
          </button>
        </div>
      </div>
    </ProModal>
  );
}
