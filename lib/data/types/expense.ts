import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const ExpenseSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  date: timestampSchema,
  category: z.enum(["Maintenance", "Utilities", "Insurance", "Tax", "Management", "Other"]),
  amount: z.number().nonnegative(),
  note: z.string().optional(),
});

export type Expense = z.infer<typeof ExpenseSchema>;
export type ExpenseCategory = Expense["category"];

export const NewExpenseSchema = ExpenseSchema.omit({ id: true });
export type NewExpense = z.infer<typeof NewExpenseSchema>;
export const ExpensePatchSchema = NewExpenseSchema.partial();
export type ExpensePatch = z.infer<typeof ExpensePatchSchema>;
