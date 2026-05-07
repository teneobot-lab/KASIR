import { Router, type IRouter } from "express";
import { db, shiftsTable, usersTable, transactionsTable, transactionItemsTable, transactionPaymentsTable, productsTable } from "@workspace/db";
import { eq, desc, and, gte, lte, sum, count } from "drizzle-orm";

const router: IRouter = Router();

async function shiftToApi(s: typeof shiftsTable.$inferSelect) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, s.cashierId));
  return {
    id: s.id,
    cashierId: s.cashierId,
    cashierName: user?.name ?? "Unknown",
    openingCash: Number(s.openingCash),
    closingCash: s.closingCash != null ? Number(s.closingCash) : null,
    expectedCash: s.expectedCash != null ? Number(s.expectedCash) : null,
    cashDifference: s.cashDifference != null ? Number(s.cashDifference) : null,
    totalTransactions: s.totalTransactions,
    totalRevenue: Number(s.totalRevenue),
    status: s.status,
    openedAt: s.openedAt.toISOString(),
    closedAt: s.closedAt ? s.closedAt.toISOString() : null,
    note: s.note ?? null,
  };
}

router.get("/shifts", async (req, res): Promise<void> => {
  const { cashierId, from, to } = req.query as { cashierId?: string; from?: string; to?: string };
  let shifts = await db.select().from(shiftsTable).orderBy(desc(shiftsTable.openedAt));
  if (cashierId) shifts = shifts.filter((s) => s.cashierId === parseInt(cashierId, 10));
  if (from) shifts = shifts.filter((s) => s.openedAt >= new Date(from));
  if (to) shifts = shifts.filter((s) => s.openedAt <= new Date(to));
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  res.json(shifts.map((s) => ({
    id: s.id, cashierId: s.cashierId, cashierName: userMap.get(s.cashierId) ?? "Unknown",
    openingCash: Number(s.openingCash), closingCash: s.closingCash != null ? Number(s.closingCash) : null,
    expectedCash: s.expectedCash != null ? Number(s.expectedCash) : null,
    cashDifference: s.cashDifference != null ? Number(s.cashDifference) : null,
    totalTransactions: s.totalTransactions, totalRevenue: Number(s.totalRevenue),
    status: s.status, openedAt: s.openedAt.toISOString(), closedAt: s.closedAt ? s.closedAt.toISOString() : null, note: s.note ?? null,
  })));
});

router.post("/shifts", async (req, res): Promise<void> => {
  const { openingCash, note } = req.body;
  if (openingCash == null) { res.status(400).json({ error: "openingCash required" }); return; }
  const [shift] = await db.insert(shiftsTable).values({
    cashierId: 1,
    openingCash: String(openingCash), totalTransactions: 0, totalRevenue: "0",
    status: "open", note: note ?? null,
  }).returning();
  res.status(201).json(await shiftToApi(shift));
});

router.get("/shifts/active", async (_req, res): Promise<void> => {
  const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.status, "open")).orderBy(desc(shiftsTable.openedAt));
  if (!shift) { res.json({ shift: null }); return; }
  res.json({ shift: await shiftToApi(shift) });
});

router.post("/shifts/:id/close", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { closingCash, note } = req.body;
  if (closingCash == null) { res.status(400).json({ error: "closingCash required" }); return; }
  const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, id));
  if (!shift) { res.status(404).json({ error: "Shift not found" }); return; }
  const cashSales = await db.select({ total: sum(transactionPaymentsTable.amount) })
    .from(transactionPaymentsTable)
    .innerJoin(transactionsTable, eq(transactionPaymentsTable.transactionId, transactionsTable.id))
    .where(and(eq(transactionsTable.shiftId, id), eq(transactionPaymentsTable.method, "cash"), eq(transactionsTable.status, "completed")));
  const cashFromSales = Number(cashSales[0]?.total ?? 0);
  const expectedCash = Number(shift.openingCash) + cashFromSales;
  const cashDifference = Number(closingCash) - expectedCash;
  const [closed] = await db.update(shiftsTable).set({
    closingCash: String(closingCash), expectedCash: String(expectedCash),
    cashDifference: String(cashDifference), status: "closed",
    closedAt: new Date(), note: note ?? shift.note,
  }).where(eq(shiftsTable.id, id)).returning();
  res.json(await shiftToApi(closed));
});

router.get("/shifts/:id/summary", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, id));
  if (!shift) { res.status(404).json({ error: "Shift not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, shift.cashierId));
  const shiftTxs = await db.select().from(transactionsTable).where(eq(transactionsTable.shiftId, id));
  const completedTxs = shiftTxs.filter((t) => t.status === "completed");
  const txIds = completedTxs.map((t) => t.id);
  const payments = txIds.length > 0 ? await db.select().from(transactionPaymentsTable) : [];
  const shiftPayments = payments.filter((p) => txIds.includes(p.transactionId));
  const payMethodMap = new Map<string, { amount: number; count: number }>();
  for (const p of shiftPayments) {
    const existing = payMethodMap.get(p.method) ?? { amount: 0, count: 0 };
    payMethodMap.set(p.method, { amount: existing.amount + Number(p.amount), count: existing.count + 1 });
  }
  const totalRevenue = completedTxs.reduce((sum, t) => sum + Number(t.total), 0);
  const totalDiscount = completedTxs.reduce((sum, t) => sum + Number(t.discountAmount), 0);
  const grossRevenue = totalRevenue + totalDiscount;
  const salesByPaymentMethod = [...payMethodMap.entries()].map(([method, data]) => ({
    method, amount: data.amount, count: data.count, percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
  }));
  const items = txIds.length > 0 ? await db.select().from(transactionItemsTable) : [];
  const shiftItems = items.filter((i) => txIds.includes(i.transactionId));
  const productQtyMap = new Map<number, { qty: number; rev: number }>();
  for (const item of shiftItems) {
    const existing = productQtyMap.get(item.productId) ?? { qty: 0, rev: 0 };
    productQtyMap.set(item.productId, { qty: existing.qty + item.quantity, rev: existing.rev + Number(item.subtotal) });
  }
  const productIds = [...productQtyMap.keys()];
  const products = productIds.length > 0 ? await db.select().from(productsTable) : [];
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const topProducts = [...productQtyMap.entries()]
    .map(([productId, data]) => ({ productId, productName: prodMap.get(productId)?.name ?? "Unknown", sku: prodMap.get(productId)?.sku ?? "", quantitySold: data.qty, revenue: data.rev, imageUrl: prodMap.get(productId)?.imageUrl ?? null }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  res.json({
    shift: { id: shift.id, cashierId: shift.cashierId, cashierName: user?.name ?? "Unknown", openingCash: Number(shift.openingCash), closingCash: shift.closingCash != null ? Number(shift.closingCash) : null, expectedCash: shift.expectedCash != null ? Number(shift.expectedCash) : null, cashDifference: shift.cashDifference != null ? Number(shift.cashDifference) : null, totalTransactions: shift.totalTransactions, totalRevenue: Number(shift.totalRevenue), status: shift.status, openedAt: shift.openedAt.toISOString(), closedAt: shift.closedAt ? shift.closedAt.toISOString() : null, note: shift.note ?? null },
    salesByPaymentMethod, topProducts,
    transactionCount: completedTxs.length, grossRevenue, discountTotal: totalDiscount, netRevenue: totalRevenue,
  });
});

export default router;
