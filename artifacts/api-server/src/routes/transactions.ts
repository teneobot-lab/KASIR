import { Router, type IRouter } from "express";
import { db, transactionsTable, transactionItemsTable, transactionPaymentsTable, productsTable, customersTable, usersTable, shiftsTable, stockMovementsTable } from "@workspace/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

async function buildTransactionResponse(t: typeof transactionsTable.$inferSelect) {
  const items = await db.select().from(transactionItemsTable).where(eq(transactionItemsTable.transactionId, t.id));
  const payments = await db.select().from(transactionPaymentsTable).where(eq(transactionPaymentsTable.transactionId, t.id));
  const productIds = items.map((i) => i.productId);
  const products = productIds.length > 0 ? await db.select().from(productsTable) : [];
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, t.cashierId));
  let customerName: string | null = null;
  if (t.customerId) {
    const [cust] = await db.select().from(customersTable).where(eq(customersTable.id, t.customerId));
    customerName = cust?.name ?? null;
  }
  return {
    id: t.id,
    receiptNumber: t.receiptNumber,
    customerId: t.customerId ?? null,
    customerName,
    cashierId: t.cashierId,
    cashierName: user?.name ?? "Unknown",
    shiftId: t.shiftId ?? null,
    items: items.map((i) => ({
      id: i.id, productId: i.productId,
      productName: prodMap.get(i.productId)?.name ?? "Unknown",
      sku: prodMap.get(i.productId)?.sku ?? "",
      quantity: i.quantity, price: Number(i.price), discount: Number(i.discount), subtotal: Number(i.subtotal),
    })),
    payments: payments.map((p) => ({ method: p.method, amount: Number(p.amount) })),
    subtotal: Number(t.subtotal), discountAmount: Number(t.discountAmount), taxAmount: Number(t.taxAmount),
    total: Number(t.total), paidAmount: Number(t.paidAmount), changeAmount: Number(t.changeAmount),
    status: t.status, note: t.note ?? null, createdAt: t.createdAt.toISOString(),
  };
}

function generateReceiptNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `TRX${date}${seq}`;
}

router.get("/transactions", async (req, res): Promise<void> => {
  const { from, to, cashierId, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  let txs = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  if (from) txs = txs.filter((t) => t.createdAt >= new Date(from));
  if (to) txs = txs.filter((t) => t.createdAt <= new Date(to + "T23:59:59Z"));
  if (cashierId) txs = txs.filter((t) => t.cashierId === parseInt(cashierId, 10));
  if (status) txs = txs.filter((t) => t.status === status);
  const total = txs.length;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const paged = txs.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const customers = await db.select().from(customersTable);
  const custMap = new Map(customers.map((c) => [c.id, c.name]));
  const allPayments = await db.select().from(transactionPaymentsTable);
  const payMap = new Map<number, typeof transactionPaymentsTable.$inferSelect[]>();
  for (const p of allPayments) {
    const arr = payMap.get(p.transactionId) ?? [];
    arr.push(p);
    payMap.set(p.transactionId, arr);
  }
  const allItems = await db.select().from(transactionItemsTable);
  const itemMap = new Map<number, typeof transactionItemsTable.$inferSelect[]>();
  for (const i of allItems) {
    const arr = itemMap.get(i.transactionId) ?? [];
    arr.push(i);
    itemMap.set(i.transactionId, arr);
  }
  const products = await db.select().from(productsTable);
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const data = paged.map((t) => ({
    id: t.id, receiptNumber: t.receiptNumber,
    customerId: t.customerId ?? null, customerName: t.customerId ? (custMap.get(t.customerId) ?? null) : null,
    cashierId: t.cashierId, cashierName: userMap.get(t.cashierId) ?? "Unknown",
    shiftId: t.shiftId ?? null,
    items: (itemMap.get(t.id) ?? []).map((i) => ({ id: i.id, productId: i.productId, productName: prodMap.get(i.productId)?.name ?? "Unknown", sku: prodMap.get(i.productId)?.sku ?? "", quantity: i.quantity, price: Number(i.price), discount: Number(i.discount), subtotal: Number(i.subtotal) })),
    payments: (payMap.get(t.id) ?? []).map((p) => ({ method: p.method, amount: Number(p.amount) })),
    subtotal: Number(t.subtotal), discountAmount: Number(t.discountAmount), taxAmount: Number(t.taxAmount),
    total: Number(t.total), paidAmount: Number(t.paidAmount), changeAmount: Number(t.changeAmount),
    status: t.status, note: t.note ?? null, createdAt: t.createdAt.toISOString(),
  }));
  res.json({ data, total, page: pageNum, limit: limitNum });
});

router.post("/transactions", async (req, res): Promise<void> => {
  const { customerId, shiftId, items, payments, discountCode, note, taxRate = 0 } = req.body;
  if (!items?.length || !payments?.length) { res.status(400).json({ error: "items and payments required" }); return; }
  let subtotal = 0;
  const itemsWithProducts = [];
  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) { res.status(404).json({ error: `Product ${item.productId} not found` }); return; }
    const itemSubtotal = (item.price * item.quantity) - (item.discount ?? 0);
    subtotal += itemSubtotal;
    itemsWithProducts.push({ ...item, product, subtotal: itemSubtotal });
  }
  const discountAmount = 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal - discountAmount + taxAmount;
  const paidAmount = payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const changeAmount = paidAmount - total;
  const cashierId = 1;
  const receiptNumber = generateReceiptNumber();
  const [tx] = await db.insert(transactionsTable).values({
    receiptNumber, customerId: customerId ?? null, cashierId, shiftId: shiftId ?? null,
    subtotal: String(subtotal), discountAmount: String(discountAmount), taxAmount: String(taxAmount),
    total: String(total), paidAmount: String(paidAmount), changeAmount: String(Math.max(0, changeAmount)),
    status: "completed", note: note ?? null,
  }).returning();
  for (const item of itemsWithProducts) {
    await db.insert(transactionItemsTable).values({
      transactionId: tx.id, productId: item.productId, quantity: item.quantity,
      price: String(item.price), discount: String(item.discount ?? 0), subtotal: String(item.subtotal),
    });
    const product = item.product;
    const newStock = product.stock - item.quantity;
    await db.update(productsTable).set({ stock: Math.max(0, newStock) }).where(eq(productsTable.id, product.id));
    await db.insert(stockMovementsTable).values({
      productId: product.id, type: "sale", quantity: -item.quantity,
      before: product.stock, after: Math.max(0, newStock), transactionId: tx.id,
    });
  }
  for (const payment of payments) {
    await db.insert(transactionPaymentsTable).values({ transactionId: tx.id, method: payment.method, amount: String(payment.amount) });
  }
  if (shiftId) {
    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, shiftId));
    if (shift) {
      await db.update(shiftsTable).set({
        totalTransactions: shift.totalTransactions + 1,
        totalRevenue: String(Number(shift.totalRevenue) + total),
      }).where(eq(shiftsTable.id, shiftId));
    }
  }
  if (customerId) {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
    if (customer) {
      const newTotal = Number(customer.totalSpent) + total;
      const newTxCount = customer.totalTransactions + 1;
      const newPoints = customer.points + Math.floor(total / 10000);
      let tier = "regular";
      if (newTotal >= 10000000) tier = "platinum";
      else if (newTotal >= 5000000) tier = "gold";
      else if (newTotal >= 1000000) tier = "silver";
      await db.update(customersTable).set({ totalSpent: String(newTotal), totalTransactions: newTxCount, points: newPoints, tier }).where(eq(customersTable.id, customerId));
    }
  }
  res.status(201).json(await buildTransactionResponse(tx));
});

router.get("/transactions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
  res.json(await buildTransactionResponse(tx));
});

router.post("/transactions/:id/void", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { reason } = req.body;
  if (!reason) { res.status(400).json({ error: "reason required" }); return; }
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
  const items = await db.select().from(transactionItemsTable).where(eq(transactionItemsTable.transactionId, id));
  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (product) {
      const newStock = product.stock + item.quantity;
      await db.update(productsTable).set({ stock: newStock }).where(eq(productsTable.id, product.id));
      await db.insert(stockMovementsTable).values({ productId: product.id, type: "return", quantity: item.quantity, before: product.stock, after: newStock, note: `Void: ${reason}` });
    }
  }
  const [updated] = await db.update(transactionsTable).set({ status: "voided", voidReason: reason }).where(eq(transactionsTable.id, id)).returning();
  res.json(await buildTransactionResponse(updated));
});

router.post("/transactions/:id/return", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { items: returnItems, reason } = req.body;
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
  for (const ri of returnItems) {
    const [txItem] = await db.select().from(transactionItemsTable).where(eq(transactionItemsTable.id, ri.transactionItemId));
    if (txItem) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, txItem.productId));
      if (product) {
        const newStock = product.stock + ri.quantity;
        await db.update(productsTable).set({ stock: newStock }).where(eq(productsTable.id, product.id));
        await db.insert(stockMovementsTable).values({ productId: product.id, type: "return", quantity: ri.quantity, before: product.stock, after: newStock, note: `Return: ${reason}` });
      }
    }
  }
  const [updated] = await db.update(transactionsTable).set({ status: "returned" }).where(eq(transactionsTable.id, id)).returning();
  res.json(await buildTransactionResponse(updated));
});

export default router;
