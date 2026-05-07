import { pgTable, text, serial, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode"),
  description: text("description"),
  categoryId: integer("category_id"),
  supplierId: integer("supplier_id"),
  price: numeric("price", { precision: 15, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 15, scale: 2 }),
  memberPrice: numeric("member_price", { precision: 15, scale: 2 }),
  wholesalePrice: numeric("wholesale_price", { precision: 15, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(5),
  unit: text("unit").notNull().default("pcs"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
