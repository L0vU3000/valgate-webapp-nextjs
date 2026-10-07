"use client";

import { createPortal } from "react-dom";
import { AlertTriangle, ChevronDown, Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { Input } from "@/components/ui/input";
import { TYPE_LABEL } from "@/lib/property-helpers";
import { propertyTypeChoiceSchema } from "@/lib/data/types/property";
import { useEffect, useRef } from "react";
import type { QuickAddPin } from "./quick-add";
import { quickAddAddressLine } from "./quick-add";
import type { CadastreChoice } from "./use-quick-add";
import type { HoveredParcel } from "@/components/map/cadastre-layer";

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
  // The cadastral parcel under the cursor (null outside France). Display-only.
  cadastreParcel?: HoveredParcel | null;
  /** Street address of the parcel under the cursor, resolved while the pointer rests on it. Null until
   *  that lookup lands — the cadastre itself carries no address data. */
  cadastreHoverAddress?: {
    key: string;
    line: string | null;
    loading: boolean;
  } | null;
  // The parcel the user committed to, if any. Once set, this is what gets attached.
  cadastreChoice?: CadastreChoice | null;
  /** Chooses a parcel. Called with the parcel from a map click, or with none from the card's button
   *  (which then uses the parcel currently under the cursor). */
  onChooseCadastre?: (parcel?: HoveredParcel) => void;
  onFieldChange: (key: keyof QuickAddFields, value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// One label treatment for the whole card, so the five of them cannot drift apart.
const LABEL =
  "block text-[11px] font-semibold uppercase tracking-[0.05em] text-secondary mb-1.5";

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
  cadastreParcel,
  cadastreHoverAddress,
  cadastreChoice,
  onChooseCadastre,
  onFieldChange,
  onConfirm,
  onCancel,
}: QuickAddPanelProps) {
  const address = quickAddAddressLine(pin);
  const coords = `${pin.center[1].toFixed(5)}, ${pin.center[0].toFixed(5)}`;

  // The read-out follows the cursor, so its position is written IMPERATIVELY rather than through
  // React state: a mousemove fires ~60x/second, and re-rendering this subtree that often would land
  // on the map's own frame loop (the camera included). The element moves; React does not re-render.
  //
  // The listener is on `window`, not on the card: the card is a SIBLING of the map, so pointer events
  // over the canvas never reach it. `window` sees every pointer move wherever it is.
  const labelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!cadastreParcel) return;
    const onMove = (e: MouseEvent) => {
      const el = labelRef.current;
      if (!el) return;
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY - 14}px`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [cadastreParcel]);

  const areaM2 = cadastreChoice?.areaM2 ?? cadastreParcel?.contenanceM2 ?? null;

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
      {/* Hover read-out. Anchored to the pointer while a parcel is under it, so the answer to "what
          is under my cursor" appears where the cursor is — the card below then carries only the
          SELECTION. Colour is never the only signal: the dot, the parcel number and the area all
          name it, and the label is aria-hidden because the same parcel is announced by the card. */}
      {cadastreParcel &&
        // PORTALLED to <body>, and shown whenever a parcel is under the cursor — including before
        // anything is chosen, which is the state the user asked for. `position: fixed` alone is not
        // enough: this card has a transform and a backdrop-filter, either of which becomes the
        // containing block for a fixed descendant, so nested here the label was positioned against the
        // CARD and then cut off by its overflow-hidden. The portal removes every ancestor from that
        // chain, exactly as LocationPickerModal does for itself.
        createPortal(
          <div
            ref={labelRef}
            aria-hidden="true"
            // Seeded from the hover event's own cursor position, then kept in step by the mousemove
            // listener. Without the seed the label mounts AFTER the move that revealed it and sits at
            // 0,0 until the pointer's next pixel — a visible jump to the corner.
            style={{
              left: cadastreParcel.client.x,
              top: cadastreParcel.client.y - 14,
            }}
            // `left/top` are written by the mousemove listener; -50% keeps it centred on the cursor and
            // -translate-y-full lifts it above the pointer so it never covers what is being read.
            className="pointer-events-none fixed left-0 top-0 z-[60] -translate-x-1/2 -translate-y-full rounded-md border border-border-subtle bg-surface-base/95 px-2 py-1 shadow-md backdrop-blur-sm"
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              {/* Decorative: green matches the chosen/parcel green, and the parcel number beside it
                  carries the meaning, so colour is never the only signal. */}
              <span className="size-1.5 shrink-0 rounded-full bg-[color:var(--status-success)]" />
              <span className="text-[11px] font-semibold tabular-nums text-foreground">
                {[
                  cadastreParcel.section && `Section ${cadastreParcel.section}`,
                  cadastreParcel.numero && `n° ${cadastreParcel.numero}`,
                ]
                  .filter(Boolean)
                  .join(" ") || "Cadastral parcel"}
              </span>
              {cadastreParcel.contenanceM2 != null && (
                <span className="text-[11px] tabular-nums text-secondary">
                  {Math.round(cadastreParcel.contenanceM2).toLocaleString()} m²
                </span>
              )}
            </div>
            {/* The street address of the parcel UNDER THE CURSOR — the question the label exists to
                answer. The cadastre carries no address data (parcels only), so this is a reverse lookup
                of the cursor's own point, debounced while the pointer rests. Until it lands the row
                shows a spinner rather than the pin's address, which would name a different place and
                read as a wrong answer. */}
            {cadastreHoverAddress?.key === cadastreParcel.idu &&
              (cadastreHoverAddress.loading ? (
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-secondary">
                  <Loader2
                    className="size-3 shrink-0 animate-spin"
                    aria-hidden="true"
                  />
                  Finding address…
                </p>
              ) : (
                cadastreHoverAddress.line && (
                  <p className="mt-0.5 max-w-[220px] truncate text-[10px] text-secondary">
                    {cadastreHoverAddress.line}
                  </p>
                )
              ))}
          </div>,
          document.body,
        )}

      <div
        className="flex shrink-0 justify-center pt-2 pb-1 sm:hidden"
        aria-hidden="true"
      >
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
          <div
            role="status"
            aria-busy="true"
            className="flex items-center gap-2"
          >
            <Loader2 className="size-4 shrink-0 animate-spin text-interactive-primary" />
            <span className="h-5 w-3/5 animate-pulse rounded bg-surface-sunken" />
            <span className="sr-only">Finding the address…</span>
          </div>
        ) : address ? (
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-interactive-primary shrink-0 mt-0.5" />
            <span className="text-[15px] font-semibold leading-snug text-foreground">
              {address}
            </span>
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
        <p className="mt-1.5 text-[11px] tabular-nums text-text-disabled">
          {coords}
        </p>

        {/* Not yet chosen, but a parcel is under the cursor. The ACTION lives here rather than in the
            floating read-out: a moving target is hard to hit, and the read-out is pointer-events-none
            so it can never swallow the click. The read-out names what the cursor found; this commits
            to it. */}
        {!cadastreChoice && cadastreParcel?.idu && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-base/60 p-2">
            <span className="min-w-0 flex-1 text-[12px] font-medium text-secondary">
              Use the parcel under your cursor?
            </span>
            <button
              type="button"
              onClick={() => onChooseCadastre?.()}
              className="shrink-0 rounded-md bg-interactive-primary px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Use this parcel
            </button>
          </div>
        )}

        {/* The chosen parcel. This card owns the SELECTION only — the hovered parcel is named by the
            read-out at the cursor, so the two never compete for the same reading. Read-only until the
            button: hovering a parcel must never attach land on its own. */}
        {cadastreChoice && (
          <div className="mt-3 rounded-lg border border-[color:var(--status-success-border)] bg-[color:var(--status-success-bg)] p-2.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-[color:var(--status-success-text)]" />
              <span className="text-[13px] font-semibold text-[color:var(--status-success-text)]">
                {`Parcel ${cadastreChoice.label}`}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {areaM2 != null && (
                // The area pill uses the success TOKEN SET (bg + border + text), not white-on-accent.
                // In dark mode --status-success is #10B981, where white text fails contrast; the set
                // is designed to work in both modes, so it is the only safe pairing.
                <span className="rounded-full border border-[color:var(--status-success-border)] bg-[color:var(--status-success-bg)] px-2 py-[1px] text-[11px] font-semibold tabular-nums text-[color:var(--status-success-text)]">
                  {Math.round(areaM2).toLocaleString()} m²
                </span>
              )}
              <span className="rounded-full border border-[color:var(--status-success-border)] px-2 py-[1px] text-[11px] text-[color:var(--status-success-text)]">
                Cadastre
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-[color:var(--status-success-text)]">
              Selected — confirm the location below to save this parcel.
            </p>
          </div>
        )}

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
                    onChange={(e) =>
                      onFieldChange("propertyType", e.target.value)
                    }
                    className={cn(
                      SELECT,
                      !fields.propertyType && "text-muted-foreground",
                    )}
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
        <p
          role="alert"
          className="flex items-start gap-1.5 px-4 pt-2 shrink-0 text-[13px] text-destructive"
        >
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
