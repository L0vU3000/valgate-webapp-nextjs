"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { moveHighlight } from "./quick-add";
import type { GeocodeSuggestion } from "@/app/_shared/add-property/_lib/use-geocode";

interface QuickAddSearchProps {
  query: string;
  suggestions: GeocodeSuggestion[];
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

  // A new list means a new first row. Pre-selecting it is the point of the preview: the map shows
  // where the provider thinks the typed words point before the user commits to it.
  //
  // Deps are safe to be honest here — `suggestions` only changes identity when a search resolves,
  // and `onHighlight` is a stable useCallback, so this does not re-run per keystroke.
  useEffect(() => {
    setHighlight(0);
    onHighlight(suggestions[0] ?? null);
  }, [suggestions, onHighlight]);

  // Keep the highlighted row visible when arrowing past the fold of a short list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const showList = open && suggestions.length > 0;

  return (
    <div data-no-drag className="relative hidden w-[22rem] max-w-[calc(100vw-2rem)] sm:block">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-secondary" />
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
            const next = moveHighlight(highlight, suggestions.length, e.key === "ArrowDown" ? 1 : -1);
            // Clamped at an end: nothing changed, so do not re-fly the map to the same address.
            if (next === highlight) return;
            setHighlight(next);
            onHighlight(suggestions[next]);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const chosen = suggestions[highlight];
            if (!chosen) return;
            onPick(chosen);
            setOpen(false);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search an address, then ↑ ↓ to choose"
        aria-label="Search an address to place the pin"
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-glass-panel-border bg-surface-base pl-10 pr-10 text-sm text-foreground shadow-lg outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      {loading && (
        <Loader2 className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-secondary" />
      )}

      {showList && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-64 overflow-y-auto overflow-hidden rounded-xl border border-border-default bg-surface-base shadow-lg"
        >
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              id={optionId(i)}
              type="button"
              role="option"
              aria-selected={i === highlight}
              // mousedown, not click: the input's blur fires first and would close the list out from
              // under the row before the click lands. Same guard the wizard's address step uses.
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(s);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border-subtle px-4 py-3 text-left last:border-b-0",
                "transition-colors",
                i === highlight ? "bg-surface-tint" : "hover:bg-surface-tint",
              )}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-interactive-primary" />
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium text-foreground">
                  {s.mainText}
                </span>
                {s.secondaryText && (
                  <span className="block truncate text-[12px] text-secondary">
                    {s.secondaryText}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
