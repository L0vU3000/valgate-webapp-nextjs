"use client";

import { AlertTriangle, ChevronDown, Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { Input } from "@/components/ui/input";
import { TYPE_LABEL } from "@/lib/property-helpers";
import { propertyTypeChoiceSchema } from "@/lib/data/types/property";
import type { QuickAddPin } from "./quick-add";
import { quickAddAddressLine } from "./quick-add";

// Fields the user can set in the card. Deliberately a small subset — financials and photos belong
// in the wizard, which already asks for them in order. Property type is here because it is the one
// required field that cannot be derived from a coordinate: `createProperty` rejects a record
// without it, and guessing one would quietly file a house as land.
export type QuickAddFields = {
  propertyType: string;
  name: string;
  addressLine: string;
  city: string;
};

interface QuickAddPanelProps {
  // Non-null: the card only renders once a pin has been dropped (see HomePage). A previewed
  // suggestion is deliberately not enough — nothing about the record can be answered before the
  // user has chosen a location.
  pin: QuickAddPin;
  // True while the reverse lookup for the current coordinate is in flight.
  resolving: boolean;
  // True while the draft is being created on the server.
  saving: boolean;
  error: string | null;
  fields: QuickAddFields;
  onFieldChange: (key: keyof QuickAddFields, value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// One label treatment for the whole card, so the five of them cannot drift apart.
const LABEL = "block text-[11px] font-semibold uppercase tracking-[0.05em] text-secondary mb-1.5";

// A native <select> cannot use the Input component (different element), so it restates Input's
// classes. Same approach Step2BasicInfo takes for the wizard's province control.
const SELECT =
  "h-11 md:h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-input-background px-3 pr-8 text-base text-foreground outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm";

// The quick-add card, in the same slot the property drawer occupies (right sidebar on tablet+,
// bottom sheet on phone) so the handoff reads as one surface rather than two.
//
// One card, two beats: before confirmation it shows what was resolved at the pin (the last cheap
// moment to catch a wrong street, before a record exists); after, the same slot shows the property
// that was created. Replacing the panel with a second panel would flash the drawer's
// slide-out/slide-in animations for no reason — so the card morphs into the drawer instead.
//
// Hierarchy is carried by TYPE, not by boxes: the resolved address is the anchor (largest, boldest
// thing in the card), the coordinates are reference data, and the editable fields sit below a
// divider. A nested bordered card around the address would compete with the glass card that
// already contains it.
export function QuickAddPanel({
  pin,
  resolving,
  saving,
  error,
  fields,
  onFieldChange,
  onConfirm,
  onCancel,
}: QuickAddPanelProps) {
  const address = quickAddAddressLine(pin);
  const coords = `${pin.center[1].toFixed(5)}, ${pin.center[0].toFixed(5)}`;

  return (
    <div
      data-no-drag
      role="region"
      aria-label="Add a property at this location"
      className={cn(
        "absolute z-30 flex flex-col overflow-hidden bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border shadow-sm",
        "inset-x-0 bottom-0 top-auto rounded-t-2xl pb-safe max-h-[70dvh]",
        "sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-80 sm:rounded-xl sm:h-auto sm:max-h-none sm:pb-0",
        "[animation:slide-in-up_0.3s_cubic-bezier(0.16,1,0.3,1)_both] sm:[animation:slide-in-right_0.3s_cubic-bezier(0.16,1,0.3,1)_both]",
      )}
    >
      <div className="flex shrink-0 justify-center pt-2 pb-1 sm:hidden" aria-hidden="true">
        <div className="h-1 w-9 rounded-full bg-white/60" />
      </div>

      <div className="flex items-start justify-between gap-1 px-4 pt-3 pb-3 shrink-0">
        <div className="min-w-0">
          <h3 className="text-[15px] font-display font-semibold text-foreground leading-snug">
            Add a property here?
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Drag the pin to adjust the exact spot.
          </p>
        </div>
        {/* 44px on touch, the drawer's 32px from `sm:` up (pointer only). Negative margin keeps the
            larger hit area from indenting the header. */}
        <button
          onClick={onCancel}
          aria-label="Cancel quick add"
          className="-mr-2 -mt-2 flex size-11 sm:size-8 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-tint hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-1">
        <p className={LABEL}>Location</p>
        {resolving ? (
          // Skeleton at the address's own line height, so resolving a new coordinate does not
          // collapse the card and shove the fields up under the user's finger.
          <div role="status" aria-busy="true" className="flex items-center gap-2">
            <Loader2 className="size-4 shrink-0 animate-spin text-interactive-primary" />
            <span className="h-5 w-3/5 animate-pulse rounded bg-surface-sunken" />
            <span className="sr-only">Finding the address…</span>
          </div>
        ) : address ? (
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-interactive-primary shrink-0 mt-0.5" />
            <span className="text-[15px] font-semibold leading-snug text-foreground">{address}</span>
          </div>
        ) : (
          // A 200 with no item is a valid "nothing here" (water, farmland), not an error and not a
          // risk — so it gets a neutral icon and no warning colour.
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-secondary shrink-0 mt-0.5" />
            <p className="text-sm text-secondary">
              No address found here. You can still save this location.
            </p>
          </div>
        )}
        <p className="mt-1.5 text-[11px] tabular-nums text-text-disabled">{coords}</p>

        {!resolving && (
          <>
            <div className="my-4 h-px bg-border-subtle" role="presentation" />
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="quick-add-type" className={LABEL}>
                  Property type
                </label>
                <div className="relative">
                  <select
                    id="quick-add-type"
                    value={fields.propertyType}
                    onChange={(e) => onFieldChange("propertyType", e.target.value)}
                    className={cn(SELECT, !fields.propertyType && "text-muted-foreground")}
                  >
                    <option value="" disabled>
                      Select a type
                    </option>
                    {propertyTypeChoiceSchema.options.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label htmlFor="quick-add-name" className={LABEL}>
                  Property name
                </label>
                <Input
                  id="quick-add-name"
                  value={fields.name}
                  onChange={(e) => onFieldChange("name", e.target.value)}
                  placeholder="e.g. Skyline Luxury Lofts"
                  autoComplete="off"
                  enterKeyHint="done"
                />
              </div>
              <div>
                <label htmlFor="quick-add-address" className={LABEL}>
                  Street address
                </label>
                <Input
                  id="quick-add-address"
                  value={fields.addressLine}
                  onChange={(e) => onFieldChange("addressLine", e.target.value)}
                  placeholder="Street address"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="quick-add-city" className={LABEL}>
                  City
                </label>
                <Input
                  id="quick-add-city"
                  value={fields.city}
                  onChange={(e) => onFieldChange("city", e.target.value)}
                  placeholder="City"
                  autoComplete="off"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        // The Confirm button below stays enabled, so it is the retry — the message does not need a
        // second one of its own.
        <p role="alert" className="flex items-start gap-1.5 px-4 pt-2 shrink-0 text-[13px] text-destructive">
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      <div className="px-4 pb-4 pt-3 mt-auto flex items-center gap-2 shrink-0 border-t border-border-subtle">
        <button
          onClick={onCancel}
          className="flex-1 sm:flex-none rounded-xl border border-border-default px-4 py-3 sm:py-2.5 text-sm font-semibold text-secondary hover:bg-surface-tint transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          className={cn(
            "flex-1 rounded-xl px-4 py-3 sm:py-2.5 text-sm font-semibold text-white transition-all duration-150",
            !saving
              ? "bg-interactive-primary hover:brightness-110 active:scale-[0.98]"
              : "bg-interactive-primary/40 cursor-not-allowed",
          )}
        >
          {saving ? "Saving…" : "Confirm location"}
        </button>
      </div>
    </div>
  );
}
