import {
  Search,
  Plus,
  FileText,
  BarChart2,
  LayoutGrid,
  Map as MapIcon,
  Settings,
  Users,
  UserCircle,
  Building,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "../ui/utils";
import type { Property, StatusVariant } from "../../lib/mock-data";

const statusClasses: Record<StatusVariant, string> = {
  rented:
    "text-status-success-text bg-status-success-bg border border-status-success-border",
  vacant:
    "text-status-warning-text bg-status-warning-bg border border-status-warning-border",
};

function healthClass(health: number) {
  if (health >= 75) return "text-status-success-text";
  if (health >= 40) return "text-status-warning-text";
  return "text-status-danger-text";
}

export function CommandPalette({
  open,
  onOpenChange,
  properties,
  navigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  navigate: (path: string) => void;
}) {
  const mockDocs = [
    { id: "doc-1", name: "Land near river - Lease Agreement.pdf", type: "pdf" as const, modified: "2 days ago" },
    { id: "doc-2", name: "Siem Reap Land Plot - Title Deed.pdf", type: "pdf" as const, modified: "1 week ago" },
    { id: "doc-3", name: "Maintenance Log - Commercial Building", type: "doc" as const, modified: "3 days ago" },
    { id: "doc-4", name: "Portfolio Valuation Report Q1 2026", type: "doc" as const, modified: "5 days ago" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl top-[20%] translate-y-0 gap-0 rounded-xl border-border-default bg-surface-base shadow-[0_0_40px_-10px_rgba(37,99,235,0.3)] [&>button:last-child]:hidden [animation:cmd-open_0.22s_cubic-bezier(0.16,1,0.3,1)_both]">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search your portfolio — properties, documents, and navigation</DialogDescription>
        </DialogHeader>
        <Command className="bg-surface-base text-foreground [&_[cmdk-group-heading]]:text-secondary [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:px-5 [&_[cmdk-group-heading]]:py-2 [&_[data-slot=command-input-wrapper]]:h-16 [&_[data-slot=command-input-wrapper]]:px-5 [&_[data-slot=command-input-wrapper]]:gap-3 [&_[data-slot=command-input-wrapper]_svg]:size-5">
          <CommandInput
            placeholder="Search properties, documents, tenants..."
            className="h-16 text-base placeholder:text-secondary"
          />
          <CommandList className="max-h-96">
            <CommandEmpty className="py-10 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center">
                  <Search className="size-4 text-secondary" />
                </div>
                <p className="text-sm text-secondary">No matching properties or documents found.</p>
              </div>
            </CommandEmpty>

            {/* Properties */}
            <CommandGroup heading="Properties">
              {properties.slice(0, 5).map((p, i) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.code} ${p.province}`}
                  onSelect={() => navigate(`/property/${p.id}`)}
                  className="gap-3 pl-5 pr-4 py-3 border-l-4 border-transparent data-[selected=true]:border-interactive-primary data-[selected=true]:bg-brand-subtle [animation:cmd-item-in_0.18s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <div className="size-8 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
                    <Building className="size-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-secondary flex items-center gap-1.5 truncate">
                        <span className={cn("w-1.5 h-1.5 rounded-full bg-current shrink-0", healthClass(p.health))} />
                        {p.type} · {p.province}
                      </p>
                      <span className="text-xs font-mono font-medium text-foreground/60 shrink-0">{p.buy}</span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium shrink-0",
                    statusClasses[p.statusVariant],
                  )}>
                    {p.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-border-subtle" />

            {/* Documents */}
            <CommandGroup heading="Documents">
              {mockDocs.map((doc, i) => (
                <CommandItem
                  key={doc.id}
                  value={doc.name}
                  onSelect={() => navigate("/portfolio")}
                  className="gap-3 pl-5 pr-4 py-3 border-l-4 border-transparent data-[selected=true]:border-interactive-primary data-[selected=true]:bg-brand-subtle [animation:cmd-item-in_0.18s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0",
                    doc.type === "pdf" ? "bg-status-danger-bg" : "bg-status-info-bg",
                  )}>
                    <FileText className={cn(
                      "size-4",
                      doc.type === "pdf" ? "text-status-danger-text" : "text-status-info-text",
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-secondary flex items-center gap-1.5">
                      <span className="uppercase font-medium tracking-wide text-[10px] text-text-disabled">{doc.type}</span>
                      <span className="text-text-disabled">·</span>
                      Updated {doc.modified}
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
                { label: "Analytics", icon: BarChart2, path: "/analytics" },
                { label: "All Properties", icon: LayoutGrid, path: "/portfolio" },
                { label: "Map View", icon: MapIcon, path: "/map" },
                { label: "Succession Planning", icon: Users, path: "/estate-planning" },
                { label: "Settings", icon: Settings, path: "/settings" },
                { label: "Profile", icon: UserCircle, path: "/profile" },
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

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-default bg-val-bg-page-alt">
            <div className="flex items-center gap-1.5 text-[11px] text-secondary">
              {["\u2191", "\u2193"].map((k) => (
                <kbd key={k} className="bg-surface-base border border-border-default rounded px-1.5 py-0.5 font-medium text-secondary text-[11px]">
                  {k}
                </kbd>
              ))}
              <span>to navigate</span>
              <span className="text-text-disabled mx-1">·</span>
              <kbd className="bg-surface-base border border-border-default rounded px-1.5 py-0.5 font-medium text-secondary text-[11px]">
                Enter
              </kbd>
              <span>to open</span>
              <span className="text-text-disabled mx-1">·</span>
              <kbd className="bg-surface-base border border-border-default rounded px-1.5 py-0.5 font-medium text-secondary text-[11px]">
                Esc
              </kbd>
              <span>to dismiss</span>
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
