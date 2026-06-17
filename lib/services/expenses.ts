import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema";
import { ExpenseSchema, type Expense } from "@/lib/data/types/expense";
import type { NewExpense, ExpensePatch } from "@/lib/data/types/expense";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToExpense = (r: typeof expenses.$inferSelect): Expense =>
  ExpenseSchema.parse(toDomain(expenses, r)); // C6/C7

export async function listExpenses(ctx: Ctx, propertyId?: string): Promise<Expense[]> {
  const rows = await db.select().from(expenses)
    .where(propertyId
      ? and(eq(expenses.orgId, ctx.orgId), eq(expenses.propertyId, propertyId))
      : eq(expenses.orgId, ctx.orgId)) // C3
    .orderBy(asc(expenses.date), asc(expenses.id))
    .limit(500)
  return rows.map(rowToExpense);
}

export async function getExpense(ctx: Ctx, id: string): Promise<Expense | null> {
  const [row] = await db.select().from(expenses)
    .where(and(eq(expenses.orgId, ctx.orgId), eq(expenses.id, id))); // C3
  return row ? rowToExpense(row) : null;
}

export async function createExpense(ctx: Ctx, input: NewExpense): Promise<Expense> {
  return scopedInsert(ctx, expenses, "EXP", input, rowToExpense);
}

export async function updateExpense(ctx: Ctx, id: string, patch: ExpensePatch): Promise<Expense | null> {
  return scopedUpdate(ctx, expenses, id, patch, rowToExpense, false);
}

export async function deleteExpense(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, expenses, id);
}
