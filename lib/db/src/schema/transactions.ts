import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  customerId: integer("customer_id"),
  cashierId: integer("cashier_id").notNull(),
  shiftId: integer("shift_id"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).notNull(),
  changeAmount: numeric("change_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("completed"),
  note: text("note"),
  voidReason: text("void_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const transactionItemsTable = pgTable("transaction_items", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 15, scale: 2 }).notNull().default("0"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
});

export const transactionPaymentsTable = pgTable("transaction_payments", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  method: text("method").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
export type TransactionItem = typeof transactionItemsTable.$inferSelect;
export type TransactionPayment = typeof transactionPaymentsTable.$inferSelect;
