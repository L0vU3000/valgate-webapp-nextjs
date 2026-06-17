import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { properties } from "@/lib/db/schema";
import { PropertySchema, type Property } from "@/lib/data/types/property";
import type { NewProperty, PropertyPatch } from "@/lib/data/types/property";
import { toDomain, nextId, type Ctx } from "@/lib/services/_mapping";
import { scopedUpdate, scopedDelete, requireMember } from "@/lib/services/_crud";
import { convertRowToDb } from "@/lib/db/column-classifier";

const rowToProperty = (r: typeof properties.$inferSelect): Property =>
  PropertySchema.parse(toDomain(properties, r)); // C6/C7

export async function listProperties(ctx: Ctx): Promise<Property[]> {
  const rows = await db.select().from(properties)
    .where(eq(properties.orgId, ctx.orgId)) // C3
    .orderBy(asc(properties.createdAt), asc(properties.id))
    .limit(500)
  return rows.map(rowToProperty);
}

export async function getProperty(ctx: Ctx, id: string): Promise<Property | null> {
  const [row] = await db.select().from(properties)
    .where(and(eq(properties.orgId, ctx.orgId), eq(properties.id, id))); // C3
  return row ? rowToProperty(row) : null;
}

export async function createProperty(ctx: Ctx, input: NewProperty): Promise<Property> {
  requireMember(ctx);
  const id = await nextId("PROP");
  const now = Date.now();
  const merged = PropertySchema.parse({
    ...input,
    id,
    userId: ctx.userId,
    code: id,
    createdAt: now,
    updatedAt: now,
  });
  const [row] = await db.insert(properties).values({
    ...convertRowToDb(properties, merged as Record<string, unknown>),
    orgId: ctx.orgId,
  } as never).returning();
  return rowToProperty(row!);
}

export async function updateProperty(ctx: Ctx, id: string, patch: PropertyPatch): Promise<Property | null> {
  return scopedUpdate(ctx, properties, id, { ...patch, updatedAt: Date.now() }, rowToProperty, true);
}

export async function deleteProperty(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, properties, id);
}
