import { pgTable, text, serial, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const discountsTable = pgTable("discounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique(),
  type: text("type").notNull().default("percentage"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  minPurchase: numeric("min_purchase", { precision: 15, scale: 2 }),
  maxDiscount: numeric("max_discount", { precision: 15, scale: 2 }),
  startDate: text("start_date"),
  endDate: text("end_date"),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDiscountSchema = createInsertSchema(discountsTable).omit({ id: true, usageCount: true, createdAt: true, updatedAt: true });
export type InsertDiscount = z.infer<typeof insertDiscountSchema>;
export type Discount = typeof discountsTable.$inferSelect;
