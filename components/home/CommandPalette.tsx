"use client";

import { useEffect } from "react";
import {
  Search,
  Plus,
  FileText,
  LayoutGrid,
  Settings,
  UserCircle,
  Building,
  Loader2,
  MoveRight,
  MapPin,
} from "lucide-react";
import type { GeocodeSuggestion } from "@/app/_shared/add-property/_lib/use-geocode";
import { usePlaceSearch } from "@/app/_shared/add-property/_lib/use-geocode";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  useCommandState,
} from "../ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "../ui/utils";
import { useIsMobile } from "../ui/use-mobile";
import type {
  PropertyListItem,
  PropertyStatus,
} from "@/lib/data/types/property";
import type { Document } from "@/lib/data/types/document";

const statusClasses: Record<PropertyStatus, string> = {
  Rented:
    "text-status-success-text bg-status-success-bg border border-status-success-border",
  Vacant:
    "text-status-warning-text bg-status-warning-bg border border-status-warning-border",
  "For Sale":
    "text-status-info-text bg-status-info-bg border border-status-info-border",
  Sold: "text-slate-600 bg-slate-100 border border-slate-200",
  Archived: "text-slate-400 bg-slate-50 border border-slate-100",
  "Owner-Occupied":
    "text-status-success-text bg-status-success-bg border border-status-success-border",
};

function progressClass(progress: number) {
  if (progress >= 75) return "text-status-success-text";
  if (progress >= 40) return "text-status-warning-text";
  return "text-status-danger-text";
}

function isPdf(doc: Document) {
  return doc.extension === "pdf" || doc.mimeType?.includes("pdf");
}

function formatUploadDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// cmdk owns the query; the shared hook owns provider ordering and cancellation for both bars.
function PlaceResults({
  onPick,
  getBias,
}: {
  onPick: (place: GeocodeSuggestion) => void;
  getBias?: () => [number, number] | undefined;
}) {
  const query = useCommandState((state) => state.search);
  const { precise, areas, loading, search, clear } = usePlaceSearch(getBias);
  useEffect(() => {
    search(query);
    return clear;
  }, [query, search, clear]);

  return (
    <>
      {loading && (
        <div className="flex items-center gap-3 pl-5 pr-4 py-3 text-sm text-secondary">
          <Loader2 className="size-4 animate-spin" /> Searching places…
        </div>
      )}
      {[
        { heading: "Place pin", rows: precise },
        { heading: "Go to", rows: areas },
      ].map(
        ({ heading, rows }) =>
          rows.length > 0 && (
            <CommandGroup key={heading} heading={heading}>
              {rows.map((place) => (
                <CommandItem
                  key={place.id}
                  value={`place:${place.id}`}
                  // Provider matches need an exact query alias so cmdk keeps their order, counts
                  // them as results, and includes them in keyboard selection.
                  keywords={[query]}
                  onSelect={() => onPick(place)}
                  className="group gap-3 pl-5 pr-4 py-3 border-l-4 border-transparent data-[selected=true]:border-interactive-primary data-[selected=true]:bg-brand-subtle"
                >
                  <div className="size-8 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
                    {place.isArea ? (
                      <MoveRight className="size-4 text-secondary" />
                    ) : (
                      <MapPin className="size-4 text-interactive-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {place.mainText}
                    </p>
                    {place.secondaryText && (
                      <p className="text-xs text-secondary mt-0.5 truncate">
                        {place.secondaryText}
                      </p>
                    )}
                  </div>
                  <span className="hidden group-data-[selected=true]:inline shrink-0 text-[11px] text-secondary">
                    {place.isArea ? "↵ Go to" : "↵ Place pin"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ),
      )}
    </>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  properties,
  documents = [],
  navigate,
  onPickPlace,
  getBias,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: PropertyListItem[];
  documents?: Document[];
  navigate: (path: string) => void;
  /** Precision decides the action: a precise result places a pin; an area only moves the camera. */
  onPickPlace?: (place: GeocodeSuggestion) => void;
  /** Where the map is looking, so place results rank near it. */
  getBias?: () => [number, number] | undefined;
}) {
  // The command palette is a desktop-only surface. On mobile we render
  // nothing so the Dialog never mounts, any ⌘K shortcut from a paired
  // hardware keyboard is a no-op, and `setOpen(true)` calls from callers
  // are silently ignored. This matches the mobile design where search is
  // not surfaced in the chrome at all.
  const isMobile = useIsMobile();
  if (isMobile) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 gap-0 border-border-default bg-surface-base shadow-[0_0_40px_-10px_rgba(37,99,235,0.3)] [&>button:last-child]:hidden data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 [animation:cmd-open_0.22s_cubic-bezier(0.16,1,0.3,1)_both] left-1/2 -translate-x-1/2 bottom-0 sm:bottom-auto top-auto sm:top-[20%] translate-y-0 max-w-full sm:max-w-2xl w-full sm:w-[calc(100%-2rem)] rounded-t-2xl sm:rounded-xl sm:h-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>
            Search your portfolio, or go to a place
          </DialogDescription>
        </DialogHeader>
        <Command className="bg-surface-base text-foreground [&_[cmdk-group-heading]]:text-secondary [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:px-5 [&_[cmdk-group-heading]]:py-2 [&_[data-slot=command-input-wrapper]]:h-16 [&_[data-slot=command-input-wrapper]]:px-5 [&_[data-slot=command-input-wrapper]]:gap-3 [&_[data-slot=command-input-wrapper]_svg]:size-5">
          <CommandInput
            placeholder="Search addresses, places, properties, or documents..."
            aria-label="Search your portfolio, or go to a place"
            className="h-16 text-base placeholder:text-secondary"
          />
          <CommandList className="max-h-[60dvh] sm:max-h-96">
            {/* Places first: when the user types a location, "take me there" is what they mean, and it
                must outrank the portfolio matches below. */}
            <PlaceResults
              getBias={getBias}
              onPick={(place) => {
                onOpenChange(false);
                onPickPlace?.(place);
              }}
            />
            <CommandEmpty className="py-10 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center">
                  <Search className="size-4 text-secondary" />
                </div>
                <p className="text-sm text-secondary">
                  No matching places, properties or documents found.
                </p>
              </div>
            </CommandEmpty>

            {/* Properties */}
            <CommandGroup heading="Properties">
              {properties.slice(0, 5).map((p, i) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.code} ${p.province}`}
                  onSelect={() =>
                    navigate(
                      p.orgId
                        ? `/property/${p.id}?orgId=${encodeURIComponent(p.orgId)}`
                        : `/property/${p.id}`,
                    )
                  }
                  className="gap-3 pl-5 pr-4 py-3 border-l-4 border-transparent data-[selected=true]:border-interactive-primary data-[selected=true]:bg-brand-subtle [animation:cmd-item-in_0.18s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <div className="size-8 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
                    <Building className="size-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-secondary flex items-center gap-1.5 truncate">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full bg-current shrink-0",
                            progressClass(p.progress),
                          )}
                        />
                        {p.type} · {p.province}
                      </p>
                      <span className="text-xs font-mono font-medium text-foreground/60 shrink-0">
                        {p.buy}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium shrink-0",
                      statusClasses[p.status],
                    )}
                  >
                    {p.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-border-subtle" />

            {/* Documents */}
            <CommandGroup heading="Documents">
              {documents.slice(0, 5).map((doc, i) => (
                <CommandItem
                  key={doc.id}
                  value={doc.name}
                  onSelect={() => navigate("/portfolio")}
                  className="gap-3 pl-5 pr-4 py-3 border-l-4 border-transparent data-[selected=true]:border-interactive-primary data-[selected=true]:bg-brand-subtle [animation:cmd-item-in_0.18s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <div
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center shrink-0",
                      isPdf(doc) ? "bg-status-danger-bg" : "bg-status-info-bg",
                    )}
                  >
                    <FileText
                      className={cn(
                        "size-4",
                        isPdf(doc)
                          ? "text-status-danger-text"
                          : "text-status-info-text",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-secondary flex items-center gap-1.5">
                      <span className="uppercase font-medium tracking-wide text-[10px] text-text-disabled">
                        {doc.category ?? doc.extension?.toUpperCase() ?? "FILE"}
                      </span>
                      <span className="text-text-disabled">·</span>
                      {formatUploadDate(doc.uploadedAt)}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-border-subtle" />

            {/* Navigate */}
            <CommandGroup heading="Navigate">
              {[
                { label: "Add Property", icon: Plus, path: "/add-property" },
                {
                  label: "All Properties",
                  icon: LayoutGrid,
                  path: "/portfolio",
                },
                { label: "Settings", icon: Settings, path: "/settings" },
                {
                  label: "Profile",
                  icon: UserCircle,
                  path: "/settings?section=profile",
                },
              ].map(({ label, icon: Icon, path }, i) => (
                <CommandItem
                  key={path}
                  value={label}
                  onSelect={() => navigate(path)}
                  className="gap-3 pl-5 pr-4 py-3 border-l-4 border-transparent data-[selected=true]:border-interactive-primary data-[selected=true]:bg-brand-subtle [animation:cmd-item-in_0.18s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="size-8 rounded-lg bg-brand-subtle flex items-center justify-center shrink-0">
                    <Icon className="size-4 text-interactive-primary" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          {/* Footer — keyboard hints + branding stacked and centered */}
          <div className="flex flex-col items-center justify-center gap-1.5 px-5 pt-3 pb-safe sm:py-3 border-t border-border-default bg-val-bg-page-alt rounded-b-2xl sm:rounded-b-xl">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-secondary flex-wrap text-center">
              ↑↓ to browse · ↵ to select · Esc to close
            </div>
            <span className="text-[10px] font-semibold text-interactive-primary tracking-widest uppercase opacity-60">
              Valgate Search
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
