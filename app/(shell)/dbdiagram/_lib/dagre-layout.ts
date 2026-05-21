import dagre from "@dagrejs/dagre";
import type { FkEdge, IntrospectedEntity } from "./introspect";
import { CARD_WIDTH, estimateCardHeight, GROUPS } from "./groups";

export type LayoutPosition = { x: number; y: number };
export type LayoutPositions = Record<string, LayoutPosition>;

const GROUP_GAP  = 100; // horizontal gap between group columns
const CARD_GAP_H =  20; // horizontal gap between cards in the same rank row
const CARD_GAP_V =  28; // vertical gap between rank rows within a column
const LAYER_GAP  = 120; // vertical gap between hierarchy layers
const IDENTITY_Y =  60; // canvas top margin

type BoundedPositions = {
  positions: LayoutPositions;
  width: number;
  height: number;
};

// Runs Dagre on a subset of entities and normalises positions to a 0,0 origin.
function runSubDagre(
  entities: IntrospectedEntity[],
  intraEdges: FkEdge[],
): BoundedPositions {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 120, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));

  const known = new Set(entities.map((e) => e.name));
  for (const entity of entities) {
    g.setNode(entity.name, {
      width: CARD_WIDTH,
      height: estimateCardHeight(entity.fieldCount, Boolean(entity.note)),
    });
  }
  for (const edge of intraEdges) {
    if (!known.has(edge.source) || !known.has(edge.target)) continue;
    g.setEdge(edge.target, edge.source);
  }

  dagre.layout(g);

  const raw: LayoutPositions = {};
  let minX = Infinity, minY = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
  for (const entity of entities) {
    const node = g.node(entity.name);
    if (!node) continue;
    const h = estimateCardHeight(entity.fieldCount, Boolean(entity.note));
    const x = Math.round(node.x - CARD_WIDTH / 2);
    const y = Math.round(node.y - h / 2);
    raw[entity.name] = { x, y };
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + CARD_WIDTH > maxRight) maxRight = x + CARD_WIDTH;
    if (y + h > maxBottom) maxBottom = y + h;
  }

  const positions: LayoutPositions = {};
  for (const [name, pos] of Object.entries(raw)) {
    positions[name] = { x: pos.x - minX, y: pos.y - minY };
  }
  return { positions, width: maxRight - minX, height: maxBottom - minY };
}

// Runs Dagre on ALL non-identity entities together (all FK edges including
// cross-group) and returns each entity's Dagre centre-y as a rank proxy.
// Low y = widely-referenced core; high y = leaf dependent.
function computeGlobalRankY(
  entities: IntrospectedEntity[],
  fkEdges: FkEdge[],
): Map<string, number> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 140, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));

  const known = new Set(entities.map((e) => e.name));
  for (const entity of entities) {
    g.setNode(entity.name, {
      width: CARD_WIDTH,
      height: estimateCardHeight(entity.fieldCount, Boolean(entity.note)),
    });
  }
  for (const edge of fkEdges) {
    if (!known.has(edge.source) || !known.has(edge.target)) continue;
    g.setEdge(edge.target, edge.source);
  }

  dagre.layout(g);

  const result = new Map<string, number>();
  for (const entity of entities) {
    const node = g.node(entity.name);
    if (node) result.set(entity.name, node.y);
  }
  return result;
}

type RankBucket = { rankY: number; entities: IntrospectedEntity[] };
type GroupColumnLayout = { buckets: RankBucket[]; width: number; height: number };

function buildColumnLayout(
  ents: IntrospectedEntity[],
  globalRankY: Map<string, number>,
): GroupColumnLayout {
  const rankMap = new Map<number, IntrospectedEntity[]>();
  for (const entity of ents) {
    const ry = globalRankY.get(entity.name) ?? 0;
    if (!rankMap.has(ry)) rankMap.set(ry, []);
    rankMap.get(ry)!.push(entity);
  }

  const buckets: RankBucket[] = [...rankMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rankY, entities]) => ({ rankY, entities }));

  const width = Math.max(
    ...buckets.map(
      (b) => b.entities.length * CARD_WIDTH + (b.entities.length - 1) * CARD_GAP_H,
    ),
  );

  const height = buckets.reduce((acc, b) => {
    const rowH = Math.max(
      ...b.entities.map((e) => estimateCardHeight(e.fieldCount, Boolean(e.note))),
    );
    return acc + rowH + CARD_GAP_V;
  }, -CARD_GAP_V);

  return { buckets, width, height };
}

function placeColumn(
  col: GroupColumnLayout,
  originX: number,
  originY: number,
  out: LayoutPositions,
) {
  let currentY = 0;
  for (const bucket of col.buckets) {
    let currentX = 0;
    for (const entity of bucket.entities) {
      out[entity.name] = { x: originX + currentX, y: originY + currentY };
      currentX += CARD_WIDTH + CARD_GAP_H;
    }
    const rowH = Math.max(
      ...bucket.entities.map((e) =>
        estimateCardHeight(e.fieldCount, Boolean(e.note)),
      ),
    );
    currentY += rowH + CARD_GAP_V;
  }
}

// Three-tier layout:
//   Layer 1 — Identity      (top, centered)
//   Layer 2 — Property core (middle, centered — the schema's anchor)
//   Layer 3 — All other groups (horizontal columns at bottom)
export function groupedLayout(
  entities: IntrospectedEntity[],
  fkEdges: FkEdge[],
): LayoutPositions {
  const entityGroup = new Map<string, string>();
  for (const group of GROUPS) {
    for (const member of group.members) entityGroup.set(member, group.id);
  }

  const groupEntities = new Map<string, IntrospectedEntity[]>(
    GROUPS.map((g) => [g.id, []]),
  );
  const ungrouped: IntrospectedEntity[] = [];
  for (const entity of entities) {
    const gid = entityGroup.get(entity.name);
    if (gid) groupEntities.get(gid)!.push(entity);
    else ungrouped.push(entity);
  }

  const intraEdgesFor = (id: string): FkEdge[] =>
    fkEdges.filter(
      (e) => entityGroup.get(e.source) === id && entityGroup.get(e.target) === id,
    );

  // Layer 1: Identity — sub-Dagre with intra-group edges
  const identityEnts = groupEntities.get("identity")!;
  const identityLayout =
    identityEnts.length > 0
      ? runSubDagre(identityEnts, intraEdgesFor("identity"))
      : null;

  // Global rank for all non-identity entities (cross-group FK edges included)
  const nonIdentityEnts = entities.filter(
    (e) => entityGroup.get(e.name) !== "identity",
  );
  const globalRankY = computeGlobalRankY(nonIdentityEnts, fkEdges);

  // Layer 3: bottom groups — every group except identity and property-core
  const bottomGroups = GROUPS.filter(
    (g) => g.id !== "identity" && g.id !== "property-core",
  );

  const bottomColLayouts = new Map<string, GroupColumnLayout>();
  for (const group of bottomGroups) {
    const ents = groupEntities.get(group.id)!;
    if (ents.length === 0) continue;
    bottomColLayouts.set(group.id, buildColumnLayout(ents, globalRankY));
  }

  // Total width is driven by the bottom layer
  let totalWidth = 0;
  const xOffsets = new Map<string, number>();
  for (const group of bottomGroups) {
    const col = bottomColLayouts.get(group.id);
    if (!col) continue;
    xOffsets.set(group.id, totalWidth);
    totalWidth += col.width + GROUP_GAP;
  }
  if (totalWidth > 0) totalWidth -= GROUP_GAP;

  // Layer 2: Property core — rank-bucketed column, centered over totalWidth
  const propertyEnts = groupEntities.get("property-core") ?? [];
  const propertyCol =
    propertyEnts.length > 0
      ? buildColumnLayout(propertyEnts, globalRankY)
      : null;

  // Y positions
  const identityHeight = identityLayout?.height ?? 0;
  const propertyHeight = propertyCol?.height ?? 0;
  const propertyY = IDENTITY_Y + identityHeight + LAYER_GAP;
  const bottomY   = propertyY + Math.max(0, propertyHeight) + LAYER_GAP;

  // Center identity and property over the total bottom-layer width
  const identityX = Math.round((totalWidth - (identityLayout?.width ?? 0)) / 2);
  const propertyX = Math.round((totalWidth - (propertyCol?.width ?? 0)) / 2);

  const out: LayoutPositions = {};

  if (identityLayout) {
    for (const [name, pos] of Object.entries(identityLayout.positions)) {
      out[name] = { x: identityX + pos.x, y: IDENTITY_Y + pos.y };
    }
  }

  if (propertyCol) {
    placeColumn(propertyCol, propertyX, propertyY, out);
  }

  for (const group of bottomGroups) {
    const col = bottomColLayouts.get(group.id);
    if (!col) continue;
    placeColumn(col, xOffsets.get(group.id) ?? 0, bottomY, out);
  }

  if (ungrouped.length > 0) {
    const misc = runSubDagre(ungrouped, []);
    for (const [name, pos] of Object.entries(misc.positions)) {
      out[name] = { x: totalWidth + GROUP_GAP + pos.x, y: bottomY + pos.y };
    }
  }

  return out;
}
