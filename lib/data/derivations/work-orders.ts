import type {
  MaintenanceItem,
  MaintenanceSeverity,
  MaintenanceStatus,
} from "@/lib/data/types/maintenance-item";

// Work Orders = the client-facing view over maintenance items. Maintenance items
// have no explicit due date, so "overdue" is derived from how long an active item
// has been open, against a per-severity SLA measured in days.
//
// ponytail: fixed SLA table; lift into org settings only if a client asks for
// custom maintenance terms. Emergency must be actioned fastest.
const MS_PER_DAY = 86_400_000;
const SLA_DAYS: Record<MaintenanceSeverity, number> = {
  Emergency: 2,
  Urgent: 7,
  Standard: 30,
};

// An item still needs work while it is Open or InProgress. Resolved / Cancelled
// are terminal and never count as overdue.
function isActive(status: MaintenanceStatus): boolean {
  return status === "Open" || status === "InProgress";
}

export type WorkOrderTileKey = "open" | "inProgress" | "overdue" | "resolved";

export type WorkOrderTile = {
  key: WorkOrderTileKey;
  label: string;
  count: number;
};

export type WorkOrderRow = {
  id: string;
  title: string;
  propertyId: string;
  propertyName: string;
  severity: MaintenanceSeverity;
  status: MaintenanceStatus;
  vendorName: string | null;
  cost: number | null;
  ageDays: number;
  isOverdue: boolean;
  overdueDays: number; // days past the SLA; 0 when not overdue
  createdAt: number;
};

export type WorkOrderGroup = {
  propertyId: string;
  propertyName: string;
  rows: WorkOrderRow[];
  activeCount: number;
};

export type WorkOrderBoard = {
  tiles: WorkOrderTile[];
  groups: WorkOrderGroup[];
  total: number; // non-cancelled items
  activeCount: number; // open + in progress
  overdueCount: number;
};

type Input = {
  items: MaintenanceItem[];
  propertyNames: Map<string, string>;
  vendorNames: Map<string, string>;
  now?: number;
};

// Sort rows so the work that needs attention floats to the top of each property
// group: overdue first, then by severity (Emergency → Standard), then newest.
const SEVERITY_ORDER: Record<MaintenanceSeverity, number> = {
  Emergency: 0,
  Urgent: 1,
  Standard: 2,
};
const STATUS_ORDER: Record<MaintenanceStatus, number> = {
  Open: 0,
  InProgress: 1,
  Resolved: 2,
  Cancelled: 3,
};

function toRow(
  item: MaintenanceItem,
  propertyNames: Map<string, string>,
  vendorNames: Map<string, string>,
  now: number,
): WorkOrderRow {
  const ageDays = Math.max(0, Math.floor((now - item.createdAt) / MS_PER_DAY));
  const sla = SLA_DAYS[item.severity];
  const active = isActive(item.status);
  const overdueDays = active ? Math.max(0, ageDays - sla) : 0;
  return {
    id: item.id,
    title: item.title,
    propertyId: item.propertyId,
    propertyName: propertyNames.get(item.propertyId) ?? "Unknown property",
    severity: item.severity,
    status: item.status,
    vendorName: item.vendorId ? (vendorNames.get(item.vendorId) ?? null) : null,
    cost: item.cost ?? null,
    ageDays,
    isOverdue: overdueDays > 0,
    overdueDays,
    createdAt: item.createdAt,
  };
}

export function buildWorkOrderBoard(input: Input): WorkOrderBoard {
  const now = input.now ?? Date.now();
  const rows = input.items
    .filter((item) => item.status !== "Cancelled")
    .map((item) => toRow(item, input.propertyNames, input.vendorNames, now));

  const openCount = rows.filter((r) => r.status === "Open").length;
  const inProgressCount = rows.filter((r) => r.status === "InProgress").length;
  const resolvedCount = rows.filter((r) => r.status === "Resolved").length;
  const overdueCount = rows.filter((r) => r.isOverdue).length;
  const activeCount = openCount + inProgressCount;

  const tiles: WorkOrderTile[] = [
    { key: "open", label: "Open", count: openCount },
    { key: "inProgress", label: "In progress", count: inProgressCount },
    { key: "overdue", label: "Overdue", count: overdueCount },
    { key: "resolved", label: "Resolved", count: resolvedCount },
  ];

  // Group by property, then order groups by most active work first.
  const byProperty = new Map<string, WorkOrderRow[]>();
  for (const row of rows) {
    const list = byProperty.get(row.propertyId) ?? [];
    list.push(row);
    byProperty.set(row.propertyId, list);
  }

  const groups: WorkOrderGroup[] = [...byProperty.entries()].map(
    ([propertyId, groupRows]) => {
      groupRows.sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status])
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (SEVERITY_ORDER[a.severity] !== SEVERITY_ORDER[b.severity])
          return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        return b.createdAt - a.createdAt;
      });
      return {
        propertyId,
        propertyName: groupRows[0].propertyName,
        rows: groupRows,
        activeCount: groupRows.filter((r) => isActive(r.status)).length,
      };
    },
  );

  groups.sort((a, b) => {
    if (a.activeCount !== b.activeCount) return b.activeCount - a.activeCount;
    return a.propertyName.localeCompare(b.propertyName);
  });

  return {
    tiles,
    groups,
    total: rows.length,
    activeCount,
    overdueCount,
  };
}
