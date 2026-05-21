export type GroupDef = {
  id: string;
  label: string;
  members: string[];
  borderColor: string;
  bgColor: string;
  labelColor: string;
};

export const GROUPS: GroupDef[] = [
  {
    id: "identity",
    label: "Identity",
    members: ["users", "user-profiles", "professionals"],
    borderColor: "#94a3b8",
    bgColor: "rgba(203,213,225,0.22)",
    labelColor: "#475569",
  },
  {
    id: "comms",
    label: "Comms",
    members: ["notifications", "notification-preferences"],
    borderColor: "#d97706",
    bgColor: "rgba(254,243,199,0.45)",
    labelColor: "#b45309",
  },
  {
    id: "file-management",
    label: "File Management",
    members: ["folders", "documents"],
    borderColor: "#0891b2",
    bgColor: "rgba(207,250,254,0.45)",
    labelColor: "#0e7490",
  },
  {
    id: "property-core",
    label: "Property core",
    members: ["property-valuations", "land-parcels", "properties"],
    borderColor: "#db2777",
    bgColor: "rgba(252,231,243,0.45)",
    labelColor: "#be185d",
  },
  {
    id: "rental",
    label: "Rental",
    members: ["tenants", "leases"],
    borderColor: "#16a34a",
    bgColor: "rgba(220,252,231,0.45)",
    labelColor: "#15803d",
  },
  {
    id: "finance",
    label: "Finance",
    members: ["payments", "expenses"],
    borderColor: "#2563eb",
    bgColor: "rgba(219,234,254,0.45)",
    labelColor: "#1d4ed8",
  },
  {
    id: "compliance-safety",
    label: "Compliance & Safety",
    members: [
      "inspections",
      "certifications",
      "maintenance-items",
      "safety-risks",
      "emergency-contacts",
    ],
    borderColor: "#dc2626",
    bgColor: "rgba(254,226,226,0.45)",
    labelColor: "#b91c1c",
  },
  {
    id: "estate-ownership",
    label: "Estate & Ownership",
    members: [
      "co-owners",
      "ownership-records",
      "ownership-documents",
      "ownership-history",
      "successors",
      "estate-assignments",
      "estate-activity-events",
    ],
    borderColor: "#7c3aed",
    bgColor: "rgba(237,233,254,0.45)",
    labelColor: "#6d28d9",
  },
];

export const CARD_WIDTH = 260;
export const HEADER_HEIGHT = 54;
export const ROW_HEIGHT = 22;

export function estimateCardHeight(fieldCount: number, hasNote: boolean): number {
  return HEADER_HEIGHT + fieldCount * ROW_HEIGHT + (hasNote ? ROW_HEIGHT : 0);
}

export function rowYFor(rowIndex: number): number {
  return HEADER_HEIGHT + rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
}

export type GroupRect = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderColor: string;
  bgColor: string;
  labelColor: string;
};

const PAD_X = 24;
const PAD_TOP = 56;
const PAD_BOTTOM = 32;

type SizedPosition = { x: number; y: number; height: number };

export function computeGroupRects(
  positions: Map<string, SizedPosition>,
): GroupRect[] {
  const rects: GroupRect[] = [];
  for (const group of GROUPS) {
    let minX = Infinity;
    let minY = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;
    let count = 0;
    for (const member of group.members) {
      const p = positions.get(member);
      if (!p) continue;
      count++;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      const right = p.x + CARD_WIDTH;
      const bottom = p.y + p.height;
      if (right > maxRight) maxRight = right;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    if (count === 0) continue;
    rects.push({
      id: `group-${group.id}`,
      label: group.label,
      x: minX - PAD_X,
      y: minY - PAD_TOP,
      width: maxRight - minX + PAD_X * 2,
      height: maxBottom - minY + PAD_TOP + PAD_BOTTOM,
      borderColor: group.borderColor,
      bgColor: group.bgColor,
      labelColor: group.labelColor,
    });
  }
  return rects;
}
