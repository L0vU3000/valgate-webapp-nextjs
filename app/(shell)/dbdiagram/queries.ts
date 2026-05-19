import "server-only";
import { readdirSync } from "fs";
import { join } from "path";
import * as db from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import { deriveEdges, introspectAll } from "./_lib/introspect";
import { groupedLayout, type LayoutPositions } from "./_lib/dagre-layout";
import type { DbdiagramState } from "@/lib/data/types/dbdiagram-state";
import type { IntrospectedEntity, FkEdge } from "./_lib/introspect";
import { ENTITY_WIRING, type WiringStatus } from "./_lib/wiring-status";

export type DbdiagramData = {
  entities: IntrospectedEntity[];
  edges: FkEdge[];
  state: DbdiagramState;
  layout: LayoutPositions;
  recordCounts: Record<string, number>;
  wiringStatus: Record<string, WiringStatus>;
};

function getRecordCounts(): Record<string, number> {
  const base = join(process.cwd(), "public/data/users/demo-user");
  const counts: Record<string, number> = { users: 1 };
  try {
    const entries = readdirSync(base, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "dbdiagram-state") continue;
      const records = readdirSync(join(base, entry.name), {
        withFileTypes: true,
      }).filter((e) => e.isDirectory());
      counts[entry.name] = records.length;
    }
  } catch {
    // non-fatal — diagram still works without counts
  }
  return counts;
}

export async function getDbdiagramData(): Promise<DbdiagramData> {
  const userId = getCurrentUserId();
  const entities = introspectAll();
  const edges = deriveEdges(entities);
  const layout = groupedLayout(entities, edges);
  const state = await db.dbdiagramState.get(userId);
  const recordCounts = getRecordCounts();
  return { entities, edges, state, layout, recordCounts, wiringStatus: ENTITY_WIRING };
}
