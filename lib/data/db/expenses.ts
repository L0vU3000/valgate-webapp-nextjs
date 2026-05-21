import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { ExpenseSchema, type Expense } from "../types/expense";

const COLLECTION = "expenses";
const ID_PREFIX = "EXP";

export async function list(userId: string): Promise<Expense[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => ExpenseSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Expense | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? ExpenseSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: Omit<Expense, "id">,
): Promise<Expense> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = ExpenseSchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
