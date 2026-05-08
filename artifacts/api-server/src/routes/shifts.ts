import { Router, type IRouter } from "express";
import {
  db,
  shiftsTable,
  usersTable,
  transactionsTable,
  transactionItemsTable,
  transactionPaymentsTable,
  productsTable,
} from "@workspace/db";
import { eq, desc, and, gte, lte, sum } from "drizzle-orm";
import { requireAuth, requireRole, CASHIER_ROLES, MANAGER_ROLES, ALL_STAFF } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";

const router: IRouter = Router();

router.use(requireAuth);

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

// ─── GET /api/shifts ──────────────────────────────────────────────────────────
router.get(
  "/shifts",
  requireRole(...ALL_STAFF),
  asyncHandler(async (req, res): Promise<void> => {
    const { cashierId, from, to } = req.query as { cashierId?: string; from?: string; to?: string };

    const conditions = [];
    if (cashierId) conditions.push(eq(shiftsTable.cashierId, parseInt(cashierId, 10)));
    if (from) conditions.push(gte(shiftsTable.openedAt, new Date(from)));
    if (to) conditions.push(lte(shiftsTable.openedAt, new Date(to)));

    const shifts = await db
      .select()
      .from(shiftsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(shiftsTable.openedAt));

    const cashierIds = [...new Set(shifts.map((s) => s.cashierId))];
    const users =
      cashierIds.length > 0
        ? await db.select().from(usersTable)
        : [];
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    res.json(
      shifts.map((s) => ({
        id: s.id,
        cashierId: s.cashierId,
        cashierName: userMap.get(s.cashierId) ?? "Unknown",
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
      }))
    );
  })
);

// ─── GET /api/shifts/active ───────────────────────────────────────────────────
router.get(
  "/shifts/active",
  requireRole(...ALL_STAFF),
  asyncHandler(async (_req, res): Promise<void> => {
    const [shift] = await db
      .select()
      .from(shiftsTable)
      .where(eq(shiftsTable.status, "open"))
      .orderBy(desc(shiftsTable.openedAt));
    if (!shift) { res.json({ shift: null }); return; }
    res.json({ shift: await shiftToApi(shift) });
  })
);

// ─── POST /api/shifts ─────────────────────────────────────────────────────────
router.post(
  "/shifts",
  requireRole(...CASHIER_ROLES),
  asyncHandler(async (req, res): Promise<void> => {
    const { openingCash, note } = req.body;

    if (openingCash == null || isNaN(Number(openingCash))) {
      res.status(400).json({ error: "openingCash wajib diisi dan harus berupa angka" });
      return;
    }

    // cashierId dari token, bukan dari body
    const cashierId = req.user!.id;

    // Cek apakah user sudah punya shift aktif
    const [activeShift] = await db
      .select()
      .from(shiftsTable)
      .where(and(eq(shiftsTable.cashierId, cashierId), eq(shiftsTable.status, "open")));

    if (activeShift) {
      res.status(400).json({ error: "Anda sudah memiliki shift yang sedang aktif" });
      return;
    }

    const [shift] = await db
      .insert(shiftsTable)
      .values({
        cashierId,
        openingCash: String(openingCash),
        totalTransactions: 0,
        totalRevenue: "0",
        status: "open",
        note: note ?? null,
      })
      .returning();

    req.log.info({ shiftId: shift.id, cashierId }, "Shift dibuka");
    res.status(201).json(await shiftToApi(shift));
  })
);

// ─── POST /api/shifts/:id/close ───────────────────────────────────────────────
router.post(
  "/shifts/:id/close",
  requireRole(...CASHIER_ROLES),
  asyncHandler(async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

    const { closingCash, note } = req.body;
    if (closingCash == null || isNaN(Number(closingCash))) {
      res.status(400).json({ error: "closingCash wajib diisi" });
      return;
    }

    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, id));
    if (!shift) { res.status(404).json({ error: "Shift tidak ditemukan" }); return; }
    if (shift.status !== "open") {
      res.status(400).json({ error: "Shift sudah ditutup" });
      return;
    }

    // Kasir hanya bisa tutup shift miliknya sendiri; admin bisa tutup shift siapapun
    const isAdmin = ["super_admin", "admin"].includes(req.user!.role);
    if (!isAdmin && shift.cashierId !== req.user!.id) {
      res.status(403).json({ error: "Anda hanya dapat menutup shift milik Anda sendiri" });
      return;
    }

    const cashSales = await db
      .select({ total: sum(transactionPaymentsTable.amount) })
      .from(transactionPaymentsTable)
      .innerJoin(transactionsTable, eq(transactionPaymentsTable.transactionId, transactionsTable.id))
      .where(
        and(
          eq(transactionsTable.shiftId, id),
          eq(transactionPaymentsTable.method, "cash"),
          eq(transactionsTable.status, "completed")
        )
      );

    const cashFromSales = Number(cashSales[0]?.total ?? 0);
    const expectedCash = Number(shift.openingCash) + cashFromSales;
    const cashDifference = Number(closingCash) - expectedCash;

    const [closed] = await db
      .update(shiftsTable)
      .set({
        closingCash: String(closingCash),
        expectedCash: String(expectedCash),
        cashDifference: String(cashDifference),
        status: "closed",
        closedAt: new Date(),
        note: note ?? shift.note,
      })
      .where(eq(shiftsTable.id, id))
      .returning();

    req.log.info({ shiftId: id, closedBy: req.user!.id, cashDifference }, "Shift ditutup");
    res.json(await shiftToApi(closed));
  })
);

// ─── GET /api/shifts/:id/summary ─────────────────────────────────────────────
router.get(
  "/shifts/:id/summary",
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

    const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, id));
    if (!shift) { res.status(404).json({ error: "Shift tidak ditemukan" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, shift.cashierId));
    const shiftTxs = await db.select().from(transactionsTable).where(eq(transactionsTable.shiftId, id));
    const completedTxs = shiftTxs.filter((t) => t.status === "completed");
    const txIds = completedTxs.map((t) => t.id);

    const [shiftPayments, shiftItems] = await Promise.all([
      txIds.length > 0 ? db.select().from(transactionPaymentsTable) : Promise.resolve([]),
      txIds.length > 0 ? db.select().from(transactionItemsTable) : Promise.resolve([]),
    ]);

    const filteredPayments = shiftPayments.filter((p) => txIds.includes(p.transactionId));
    const filteredItems = shiftItems.filter((i) => txIds.includes(i.transactionId));

    const payMethodMap = new Map<string, { amount: number; count: number }>();
    for (const p of filteredPayments) {
      const existing = payMethodMap.get(p.method) ?? { amount: 0, count: 0 };
      payMethodMap.set(p.method, { amount: existing.amount + Number(p.amount), count: existing.count + 1 });
    }

    const totalRevenue = completedTxs.reduce((s, t) => s + Number(t.total), 0);
    const totalDiscount = completedTxs.reduce((s, t) => s + Number(t.discountAmount), 0);

    const productQtyMap = new Map<number, { qty: number; rev: number }>();
    for (const item of filteredItems) {
      const ex = productQtyMap.get(item.productId) ?? { qty: 0, rev: 0 };
      productQtyMap.set(item.productId, { qty: ex.qty + item.quantity, rev: ex.rev + Number(item.subtotal) });
    }

    const productIds = [...productQtyMap.keys()];
    const products = productIds.length > 0 ? await db.select().from(productsTable) : [];
    const prodMap = new Map(products.map((p) => [p.id, p]));

    const topProducts = [...productQtyMap.entries()]
      .map(([productId, data]) => ({
        productId,
        productName: prodMap.get(productId)?.name ?? "Unknown",
        sku: prodMap.get(productId)?.sku ?? "",
        quantitySold: data.qty,
        revenue: data.rev,
        imageUrl: prodMap.get(productId)?.imageUrl ?? null,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({
      shift: await shiftToApi(shift),
      salesByPaymentMethod: [...payMethodMap.entries()].map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count,
        percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
      })),
      topProducts,
      transactionCount: completedTxs.length,
      grossRevenue: totalRevenue + totalDiscount,
      discountTotal: totalDiscount,
      netRevenue: totalRevenue,
    });
  })
);

export default router;
