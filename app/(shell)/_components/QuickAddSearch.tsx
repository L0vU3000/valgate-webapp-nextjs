"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, MoveRight } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { moveHighlight, suggestionRowsSignature } from "./quick-add";
import type { GeocodeSuggestion } from "@/app/_shared/add-property/_lib/use-geocode";

/**
 * A group label in the suggestion list. Matches the ⌘K palette's group headings so the two lists read
 * as the same kind of object.
 */
function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="sticky top-0 bg-surface-base px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-secondary">
      {children}
    </p>
  );
}

interface QuickAddSearchProps {
  query: string;
  suggestions: GeocodeSuggestion[];
  /** How many of `suggestions` are AREA rows (camera-only), which sit at the END of the list. Splits the
   *  dropdown into two groups so a row's promise is visible before it is picked. */
  areaCount: number;
  // True while the provider is being asked
  loading: boolean;
  onChange: (value: string) => void;
  // The keyboard-highlighted row changed. The map and the card follow it — this is the "show me
  // where that is" preview, so it fires when a fresh list arrives as well as on every arrow key.
  onHighlight: (suggestion: GeocodeSuggestion | null) => void;
  // A row was committed: clicked, or Enter on the highlighted one.
  onPick: (suggestion: GeocodeSuggestion) => void;
}

// The Quick Add button's armed state: the button becomes the address field. Typing searches the
// provider, the first row is pre-selected so the pin lands somewhere immediately, and ↑/↓ walk the
// list while the map follows — the wrong-street risk in the provider's ranking gets SEEN and fixed
// rather than committed blind.
//
// The phone hides this: the panel's bottom sheet covers the slot, and an autofocused input nobody
// can see is worse than no search at all. Phones keep tap-the-map.
export function QuickAddSearch({
  query,
  suggestions,
  areaCount,
  loading,
  onChange,
  onHighlight,
  onPick,
}: QuickAddSearchProps) {
  const [open, setOpen] = useState(true);
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listId = "quick-add-suggestions";
  const optionId = (i: number) => `${listId}-${i}`;

  const rowsSignature = suggestionRowsSignature(suggestions);
  const previousRowsSignature = useRef<string | null>(null);
  // A merged array can be new on every render. Reset only when its ordered rows change,
  // otherwise the preview render immediately erases the user's arrow-key selection.
  useEffect(() => {
    if (previousRowsSignature.current === rowsSignature) return;
    previousRowsSignature.current = rowsSignature;
    setHighlight(0);
    onHighlight(suggestions[0] ?? null);
  }, [rowsSignature, suggestions, onHighlight]);

  // Keep the highlighted row visible when arrowing past the fold of a short list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelectorAll('[role="option"]')
      [highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const showList = open && suggestions.length > 0;

  return (
    <div
      data-no-drag
      className="relative hidden w-[22rem] max-w-[calc(100vw-2rem)] sm:block"
    >
      {/* Same slot, same pill, same dropdown as the ⌘K bar — only the icon differs, deliberately.
          The magnifier means "search the app"; this pin means "put a marker on the map". It is the one
          cue that survives typing, since a placeholder does not. */}
      <MapPin
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-interactive-primary"
        aria-hidden="true"
      />
      <input
        type="text"
        autoFocus
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        // Points assistive tech at the row the user is on, without moving focus off the input.
        aria-activedescendant={showList ? optionId(highlight) : undefined}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const next = moveHighlight(
              highlight,
              suggestions.length,
              e.key === "ArrowDown" ? 1 : -1,
            );
            // Clamped at an end: nothing changed, so do not re-fly the map to the same address.
            if (next === highlight) return;
            setHighlight(next);
            onHighlight(suggestions[next]);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const chosen = suggestions[highlight];
            if (!chosen) return;
            onPick(chosen);
            if (!chosen.isArea) setOpen(false);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        // Says what a pick will do, and does NOT rotate: this is a MODE, and a mode should read as
        // steady. The ⌘K bar keeps the rotating hints; that is how the two are told apart.
        placeholder="Address to place a new property"
        aria-label="Search an address to place the pin"
        autoComplete="off"
        enterKeyHint="search"
        // The blue border is this field's ARMED state, not decoration: it is the active primary action,
        // and it is what distinguishes this bar from ⌘K while both are on screen. The shadow belongs to
        // the dropdown only — the field itself stays flat and separates by its border.
        className="h-11 w-full rounded-full border border-interactive-primary bg-surface-base pl-10 pr-16 text-sm text-foreground shadow-lg outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      {loading && (
        <Loader2 className="pointer-events-none absolute right-11 top-1/2 size-4 -translate-y-1/2 animate-spin text-secondary" />
      )}
      {/* Shows the mode is escapable without adding a second control. Dimmed while a lookup runs so the
          spinner owns the eye. */}
      <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded border border-border-default bg-surface-sunken px-1.5 py-0.5 font-sans text-[10px] font-medium text-text-disabled">
        Esc
      </kbd>

      {showList && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-64 overflow-y-auto overflow-hidden rounded-xl border border-border-default bg-surface-base shadow-lg"
        >
          {suggestions.map((s, i) => (
            <Fragment key={s.id}>
              {/* Group boundary. The two groups differ in what picking a row DOES, which is the whole
                  reason the grouping exists — so it is labelled, not just separated by a gap. */}
              {i === 0 && !s.isArea && <GroupHeading>Place pin</GroupHeading>}
              {areaCount > 0 && i === suggestions.length - areaCount && (
                <GroupHeading>Go to area</GroupHeading>
              )}
              <button
                id={optionId(i)}
                type="button"
                role="option"
                aria-selected={i === highlight}
                // mousedown, not click: the input's blur fires first and would close the list out from
                // under the row before the click lands. Same guard the wizard's address step uses.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(s);
                  // An area pick is a step in the search, not the end of it: leave the list open so the
                  // user can keep typing to narrow down. Only a pin-placing pick finishes the search.
                  if (!s.isArea) setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border-subtle px-4 py-3 text-left last:border-b-0",
                  "transition-colors",
                  i === highlight ? "bg-surface-tint" : "hover:bg-surface-tint",
                )}
              >
                {/* Each row carries its own glyph so the action is legible even with the group heading
                    scrolled off: a pin places, an arrow only goes. */}
                {s.isArea ? (
                  <MoveRight
                    className="mt-0.5 size-4 shrink-0 text-secondary"
                    aria-hidden="true"
                  />
                ) : (
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-interactive-primary"
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-foreground">
                    {s.mainText}
                  </span>
                  {s.secondaryText && (
                    <span className="block truncate text-[12px] text-secondary">
                      {s.secondaryText}
                    </span>
                  )}
                </span>
                {/* The consequence, spelled out on the row the user is about to commit with Enter. Only
                    on the highlighted row: repeating it down the list would be noise. */}
                {i === highlight && (
                  <span className="mt-0.5 shrink-0 text-[11px] text-secondary">
                    {s.isArea ? "↵ Go to" : "↵ Place pin"}
                  </span>
                )}
              </button>
            </Fragment>
          ))}
          {/* Covers the thin-geocoder case (Cambodian street coverage is patchy) using the map itself
              as the fallback, rather than adding another control. */}
          <p className="border-t border-border-subtle px-4 py-2 text-[11px] text-secondary">
            Not listed? Click the map to place it.
            <span className="block mt-1">
              ↑↓ to browse · ↵ to select · Esc to close
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
