// C8/D8: atomic prefixed-id generator backing — nextId(collection) bumps `next`.
import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const idCounters = pgTable("id_counters", {
  collection: text("collection").primaryKey(),       // e.g. "PROP", "TEN", "VRF"
  next: integer("next").notNull().default(1),
});
