import { Router, type IRouter } from "express";
import { db, transactionsTable, transactionItemsTable, transactionPaymentsTable, productsTable, customersTable, shiftsTable } from "@workspace/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requireAuth, requireRole, ADMIN_ROLES, MANAGER_ROLES, ALL_STAFF } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";

const router: IRouter = Router();
router.use(requireAuth);

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function todayEnd() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

router.get("/reports/dashboard", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayS = todayStart();
  const todayE = todayEnd();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const allTx = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  const completedTx = allTx.filter((t) => t.status === "completed");
  const todayTx = completedTx.filter((t) => t.createdAt >= todayS && t.createdAt <= todayE);
  const weekTx = completedTx.filter((t) => t.createdAt >= weekStart);
  const monthTx = completedTx.filter((t) => t.createdAt >= monthStart);
  const yesterdayStart = new Date(todayS); yesterdayStart.setDate(todayS.getDate() - 1);
  const yesterdayEnd = new Date(todayE); yesterdayEnd.setDate(todayE.getDate() - 1);
  const yesterdayTx = completedTx.filter((t) => t.createdAt >= yesterdayStart && t.createdAt <= yesterdayEnd);
  const todayRevenue = todayTx.reduce((s, t) => s + Number(t.total), 0);
  const yesterdayRevenue = yesterdayTx.reduce((s, t) => s + Number(t.total), 0);
  const revenueGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
  const transactionGrowth = yesterdayTx.length > 0 ? ((todayTx.length - yesterdayTx.length) / yesterdayTx.length) * 100 : 0;
  const todayCustomerIds = [...new Set(todayTx.filter((t) => t.customerId).map((t) => t.customerId!))];
  const products = await db.select().from(productsTable);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const activeShifts = (await db.select().from(shiftsTable).where(eq(shiftsTable.status, "open"))).length;
  const allItems = await db.select().from(transactionItemsTable);
  const todayTxIds = new Set(todayTx.map((t) => t.id));
  const todayItems = allItems.filter((i) => todayTxIds.has(i.transactionId));
  const prodQty = new Map<number, { qty: number; rev: number }>();
  for (const i of todayItems) {
    const ex = prodQty.get(i.productId) ?? { qty: 0, rev: 0 };
    prodQty.set(i.productId, { qty: ex.qty + i.quantity, rev: ex.rev + Number(i.subtotal) });
  }
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const topProductsToday = [...prodQty.entries()]
    .map(([productId, data]) => ({ productId, productName: prodMap.get(productId)?.name ?? "", sku: prodMap.get(productId)?.sku ?? "", quantitySold: data.qty, revenue: data.rev, imageUrl: prodMap.get(productId)?.imageUrl ?? null }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const recentTransactions = allTx.slice(0, 10);
  const payments = await db.select().from(transactionPaymentsTable);
  const payMap = new Map<number, typeof transactionPaymentsTable.$inferSelect[]>();
  for (const p of payments) { const arr = payMap.get(p.transactionId) ?? []; arr.push(p); payMap.set(p.transactionId, arr); }
  const itemMap = new Map<number, typeof transactionItemsTable.$inferSelect[]>();
  for (const i of allItems) { const arr = itemMap.get(i.transactionId) ?? []; arr.push(i); itemMap.set(i.transactionId, arr); }
  const customers = await db.select().from(customersTable);
  const custMap = new Map(customers.map((c) => [c.id, c.name]));
  const hourlyMap = new Map<number, { rev: number; cnt: number }>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, { rev: 0, cnt: 0 });
  for (const t of todayTx) {
    const h = new Date(t.createdAt).getHours();
    const ex = hourlyMap.get(h)!;
    hourlyMap.set(h, { rev: ex.rev + Number(t.total), cnt: ex.cnt + 1 });
  }
  const hourlySalesToday = [...hourlyMap.entries()].map(([hour, data]) => ({ hour, revenue: data.rev, transactions: data.cnt }));
  res.json({
    todayRevenue, todayTransactions: todayTx.length, todayCustomers: todayCustomerIds.length,
    weekRevenue: weekTx.reduce((s, t) => s + Number(t.total), 0),
    monthRevenue: monthTx.reduce((s, t) => s + Number(t.total), 0),
    revenueGrowth, transactionGrowth, lowStockCount, activeShifts,
    topProductsToday,
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id, receiptNumber: t.receiptNumber, customerId: t.customerId ?? null,
      customerName: t.customerId ? (custMap.get(t.customerId) ?? null) : null,
      cashierId: t.cashierId, cashierName: "Kasir", shiftId: t.shiftId ?? null,
      items: (itemMap.get(t.id) ?? []).map((i) => ({ id: i.id, productId: i.productId, productName: prodMap.get(i.productId)?.name ?? "", sku: "", quantity: i.quantity, price: Number(i.price), discount: Number(i.discount), subtotal: Number(i.subtotal) })),
      payments: (payMap.get(t.id) ?? []).map((p) => ({ method: p.method, amount: Number(p.amount) })),
      subtotal: Number(t.subtotal), discountAmount: Number(t.discountAmount), taxAmount: Number(t.taxAmount),
      total: Number(t.total), paidAmount: Number(t.paidAmount), changeAmount: Number(t.changeAmount),
      status: t.status, note: t.note ?? null, createdAt: t.createdAt.toISOString(),
    })),
    hourlySalesToday,
  });
});

router.get("/reports/sales", async (req, res): Promise<void> => {
  const { from, to, groupBy = "day" } = req.query as { from: string; to: string; groupBy?: string };
  if (!from || !to) { res.status(400).json({ error: "from and to required" }); return; }
  const fromDate = new Date(from);
  const toDate = new Date(to + "T23:59:59Z");
  const txs = (await db.select().from(transactionsTable).orderBy(transactionsTable.createdAt))
    .filter((t) => t.status === "completed" && t.createdAt >= fromDate && t.createdAt <= toDate);
  const buckets = new Map<string, { revenue: number; transactions: number }>();
  for (const t of txs) {
    let key: string;
    const d = new Date(t.createdAt);
    if (groupBy === "month") key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    else if (groupBy === "week") {
      const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else key = d.toISOString().slice(0, 10);
    const ex = buckets.get(key) ?? { revenue: 0, transactions: 0 };
    buckets.set(key, { revenue: ex.revenue + Number(t.total), transactions: ex.transactions + 1 });
  }
  const totalRevenue = txs.reduce((s, t) => s + Number(t.total), 0);
  const data = [...buckets.entries()].map(([date, d]) => ({
    date, revenue: d.revenue, transactions: d.transactions, avgOrderValue: d.transactions > 0 ? d.revenue / d.transactions : 0,
  }));
  res.json({ from, to, totalRevenue, totalTransactions: txs.length, avgOrderValue: txs.length > 0 ? totalRevenue / txs.length : 0, data });
});

router.get("/reports/top-products", async (req, res): Promise<void> => {
  const { from, to, limit = "10" } = req.query as { from?: string; to?: string; limit?: string };
  let txIds: number[];
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to + "T23:59:59Z");
    const txs = (await db.select().from(transactionsTable))
      .filter((t) => t.status === "completed" && t.createdAt >= fromDate && t.createdAt <= toDate);
    txIds = txs.map((t) => t.id);
  } else {
    const txs = (await db.select().from(transactionsTable)).filter((t) => t.status === "completed");
    txIds = txs.map((t) => t.id);
  }
  const items = (await db.select().from(transactionItemsTable)).filter((i) => txIds.includes(i.transactionId));
  const products = await db.select().from(productsTable);
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const prodAgg = new Map<number, { qty: number; rev: number }>();
  for (const i of items) {
    const ex = prodAgg.get(i.productId) ?? { qty: 0, rev: 0 };
    prodAgg.set(i.productId, { qty: ex.qty + i.quantity, rev: ex.rev + Number(i.subtotal) });
  }
  const top = [...prodAgg.entries()]
    .map(([productId, data]) => ({ productId, productName: prodMap.get(productId)?.name ?? "", sku: prodMap.get(productId)?.sku ?? "", quantitySold: data.qty, revenue: data.rev, imageUrl: prodMap.get(productId)?.imageUrl ?? null }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, parseInt(limit, 10));
  res.json(top);
});

router.get("/reports/revenue-by-category", async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  let txIds: number[];
  const txs = (await db.select().from(transactionsTable)).filter((t) => t.status === "completed");
  if (from && to) {
    const fromDate = new Date(from); const toDate = new Date(to + "T23:59:59Z");
    txIds = txs.filter((t) => t.createdAt >= fromDate && t.createdAt <= toDate).map((t) => t.id);
  } else txIds = txs.map((t) => t.id);
  const items = (await db.select().from(transactionItemsTable)).filter((i) => txIds.includes(i.transactionId));
  const products = await db.select().from(productsTable);
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const catAgg = new Map<string, { rev: number; cnt: number; catId: number | null }>();
  for (const i of items) {
    const prod = prodMap.get(i.productId);
    const catKey = prod?.categoryId != null ? String(prod.categoryId) : "uncategorized";
    const ex = catAgg.get(catKey) ?? { rev: 0, cnt: 0, catId: prod?.categoryId ?? null };
    catAgg.set(catKey, { rev: ex.rev + Number(i.subtotal), cnt: ex.cnt + 1, catId: prod?.categoryId ?? null });
  }
  const totalRevenue = [...catAgg.values()].reduce((s, d) => s + d.rev, 0);
  res.json([...catAgg.entries()].map(([key, data]) => ({
    categoryId: data.catId, categoryName: key === "uncategorized" ? "Tanpa Kategori" : `Kategori ${key}`,
    revenue: data.rev, transactions: data.cnt, percentage: totalRevenue > 0 ? (data.rev / totalRevenue) * 100 : 0,
  })).sort((a, b) => b.revenue - a.revenue));
});

router.get("/reports/payment-methods", async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  let txIds: number[];
  const txs = (await db.select().from(transactionsTable)).filter((t) => t.status === "completed");
  if (from && to) {
    const fromDate = new Date(from); const toDate = new Date(to + "T23:59:59Z");
    txIds = txs.filter((t) => t.createdAt >= fromDate && t.createdAt <= toDate).map((t) => t.id);
  } else txIds = txs.map((t) => t.id);
  const payments = (await db.select().from(transactionPaymentsTable)).filter((p) => txIds.includes(p.transactionId));
  const methodMap = new Map<string, { amount: number; count: number }>();
  for (const p of payments) {
    const ex = methodMap.get(p.method) ?? { amount: 0, count: 0 };
    methodMap.set(p.method, { amount: ex.amount + Number(p.amount), count: ex.count + 1 });
  }
  const totalAmount = [...methodMap.values()].reduce((s, d) => s + d.amount, 0);
  res.json([...methodMap.entries()].map(([method, data]) => ({
    method, amount: data.amount, count: data.count, percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
  })).sort((a, b) => b.amount - a.amount));
});

router.get("/reports/hourly-sales", async (req, res): Promise<void> => {
  const { date } = req.query as { date?: string };
  const targetDate = date ? new Date(date) : new Date();
  const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate); end.setHours(23, 59, 59, 999);
  const txs = (await db.select().from(transactionsTable))
    .filter((t) => t.status === "completed" && t.createdAt >= start && t.createdAt <= end);
  const hourlyMap = new Map<number, { rev: number; cnt: number }>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, { rev: 0, cnt: 0 });
  for (const t of txs) {
    const h = new Date(t.createdAt).getHours();
    const ex = hourlyMap.get(h)!;
    hourlyMap.set(h, { rev: ex.rev + Number(t.total), cnt: ex.cnt + 1 });
  }
  res.json([...hourlyMap.entries()].map(([hour, data]) => ({ hour, revenue: data.rev, transactions: data.cnt })));
});

export default router;
