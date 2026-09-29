"use client";

import { useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { GeocodeSuggestion } from "@/app/_shared/add-property/_lib/use-geocode";

interface QuickAddSearchProps {
  query: string;
  suggestions: GeocodeSuggestion[];
  // True while the provider is being asked
  loading: boolean;
  onChange: (value: string) => void;
  // Enter with nothing picked — resolves the query to its best match, or null
  onSubmit: () => void;
  onPick: (suggestion: GeocodeSuggestion) => void;
}

// The Quick Add button's armed state: the button becomes the address field. Typing searches the
// provider; Enter or a row drops the pin on the address's own coordinate.
//
// ponytail: Enter takes the top suggestion. The provider answers ~4/23 street queries with a
// neighbouring street (see use-geocode), so the list stays open as the correction path — Enter is
// the shortcut, not the only way in.
//
// The phone hides this: the panel's bottom sheet covers the slot, and an autofocused input nobody
// can see is worse than no search at all. Phones keep tap-the-map.
export function QuickAddSearch({
  query,
  suggestions,
  loading,
  onChange,
  onSubmit,
  onPick,
}: QuickAddSearchProps) {
  const [open, setOpen] = useState(true);

  return (
    <div data-no-drag className="relative hidden w-[22rem] max-w-[calc(100vw-2rem)] sm:block">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-secondary" />
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void onSubmit();
            setOpen(false);
          }
        }}
        placeholder="Search an address, then press Enter"
        aria-label="Search an address to place the pin"
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-glass-panel-border bg-surface-base pl-10 pr-10 text-sm text-foreground shadow-lg outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      {loading && (
        <Loader2 className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-secondary" />
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-64 overflow-y-auto overflow-hidden rounded-xl border border-border-default bg-surface-base shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              // mousedown, not click: the input's blur fires first and would close the list out from
              // under the row before the click lands. Same guard the wizard's address step uses.
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(s);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border-subtle px-4 py-3 text-left last:border-b-0",
                "hover:bg-surface-tint transition-colors",
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
