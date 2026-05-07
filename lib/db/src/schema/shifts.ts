import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shiftsTable = pgTable("shifts", {
  id: serial("id").primaryKey(),
  cashierId: integer("cashier_id").notNull(),
  openingCash: numeric("opening_cash", { precision: 15, scale: 2 }).notNull(),
  closingCash: numeric("closing_cash", { precision: 15, scale: 2 }),
  expectedCash: numeric("expected_cash", { precision: 15, scale: 2 }),
  cashDifference: numeric("cash_difference", { precision: 15, scale: 2 }),
  totalTransactions: integer("total_transactions").notNull().default(0),
  totalRevenue: numeric("total_revenue", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("open"),
  note: text("note"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const insertShiftSchema = createInsertSchema(shiftsTable).omit({ id: true, closingCash: true, expectedCash: true, cashDifference: true, closedAt: true });
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shiftsTable.$inferSelect;
