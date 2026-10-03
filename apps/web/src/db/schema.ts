import { integer, jsonb, pgTable, timestamp } from "drizzle-orm/pg-core";

export const loadouts = pgTable("loadouts", {
  id: integer("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
