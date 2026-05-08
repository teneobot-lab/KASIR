import { Router, type IRouter } from "express";
import {
  db,
  transactionsTable,
  transactionItemsTable,
  transactionPaymentsTable,
  productsTable,
  customersTable,
  usersTable,
  shiftsTable,
  stockMovementsTable,
} from "@workspace/db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, requireRole, CASHIER_ROLES, MANAGER_ROLES, ALL_STAFF } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";

const router: IRouter = Router();

// Semua endpoint transaksi wajib login
router.use(requireAuth);

// ─── Helper: build full transaction response ─────────────────────────────────
async function buildTransactionResponse(t: typeof transactionsTable.$inferSelect) {
  const [items, payments] = await Promise.all([
    db.select().from(transactionItemsTable).where(eq(transactionItemsTable.transactionId, t.id)),
    db.select().from(transactionPaymentsTable).where(eq(transactionPaymentsTable.transactionId, t.id)),
  ]);

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products =
    productIds.length > 0
      ? await db.select().from(productsTable).where(
          sql`${productsTable.id} = ANY(ARRAY[${sql.join(productIds.map((id) => sql`${id}`), sql`, `)}]::int[])`
        )
      : [];
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
      id: i.id,
      productId: i.productId,
      productName: prodMap.get(i.productId)?.name ?? "Unknown",
      sku: prodMap.get(i.productId)?.sku ?? "",
      quantity: i.quantity,
      price: Number(i.price),
      discount: Number(i.discount),
      subtotal: Number(i.subtotal),
    })),
    payments: payments.map((p) => ({ method: p.method, amount: Number(p.amount) })),
    subtotal: Number(t.subtotal),
    discountAmount: Number(t.discountAmount),
    taxAmount: Number(t.taxAmount),
    total: Number(t.total),
    paidAmount: Number(t.paidAmount),
    changeAmount: Number(t.changeAmount),
    status: t.status,
    note: t.note ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}


// ─── GET /api/transactions ────────────────────────────────────────────────────
router.get(
  "/transactions",
  requireRole(...ALL_STAFF),
  asyncHandler(async (req, res): Promise<void> => {
    const { from, to, cashierId, status, page = "1", limit = "20" } =
      req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    // Build filter conditions untuk query DB (bukan filter di memory)
    const conditions = [];
    if (from) conditions.push(gte(transactionsTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(transactionsTable.createdAt, new Date(to + "T23:59:59Z")));
    if (cashierId) conditions.push(eq(transactionsTable.cashierId, parseInt(cashierId, 10)));
    if (status) conditions.push(eq(transactionsTable.status, status as "completed" | "voided" | "returned"));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Hitung total dengan COUNT di DB
    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(transactionsTable)
      .where(whereClause);

    // Ambil data halaman yang diminta saja
    const txs = await db
      .select()
      .from(transactionsTable)
      .where(whereClause)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    if (txs.length === 0) {
      res.json({ data: [], total: Number(total), page: pageNum, limit: limitNum });
      return;
    }

    // Batch load semua relasi sekaligus
    const txIds = txs.map((t) => t.id);
    const cashierIds = [...new Set(txs.map((t) => t.cashierId))];
    const customerIds = [...new Set(txs.map((t) => t.customerId).filter(Boolean))] as number[];

    const [allItems, allPayments, users, customers] = await Promise.all([
      db.select().from(transactionItemsTable).where(
        sql`${transactionItemsTable.transactionId} = ANY(ARRAY[${sql.join(txIds.map((id) => sql`${id}`), sql`, `)}]::int[])`
      ),
      db.select().from(transactionPaymentsTable).where(
        sql`${transactionPaymentsTable.transactionId} = ANY(ARRAY[${sql.join(txIds.map((id) => sql`${id}`), sql`, `)}]::int[])`
      ),
      cashierIds.length > 0
        ? db.select().from(usersTable).where(
            sql`${usersTable.id} = ANY(ARRAY[${sql.join(cashierIds.map((id) => sql`${id}`), sql`, `)}]::int[])`
          )
        : Promise.resolve([]),
      customerIds.length > 0
        ? db.select().from(customersTable).where(
            sql`${customersTable.id} = ANY(ARRAY[${sql.join(customerIds.map((id) => sql`${id}`), sql`, `)}]::int[])`
          )
        : Promise.resolve([]),
    ]);

    // Build index maps
    const productIds = [...new Set(allItems.map((i) => i.productId))];
    const products =
      productIds.length > 0
        ? await db.select().from(productsTable).where(
            sql`${productsTable.id} = ANY(ARRAY[${sql.join(productIds.map((id) => sql`${id}`), sql`, `)}]::int[])`
          )
        : [];

    const prodMap = new Map(products.map((p) => [p.id, p]));
    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const custMap = new Map(customers.map((c) => [c.id, c.name]));
    const itemMap = new Map<number, typeof allItems>();
    const payMap = new Map<number, typeof allPayments>();

    for (const i of allItems) {
      const arr = itemMap.get(i.transactionId) ?? [];
      arr.push(i);
      itemMap.set(i.transactionId, arr);
    }
    for (const p of allPayments) {
      const arr = payMap.get(p.transactionId) ?? [];
      arr.push(p);
      payMap.set(p.transactionId, arr);
    }

    const data = txs.map((t) => ({
      id: t.id,
      receiptNumber: t.receiptNumber,
      customerId: t.customerId ?? null,
      customerName: t.customerId ? (custMap.get(t.customerId) ?? null) : null,
      cashierId: t.cashierId,
      cashierName: userMap.get(t.cashierId) ?? "Unknown",
      shiftId: t.shiftId ?? null,
      items: (itemMap.get(t.id) ?? []).map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: prodMap.get(i.productId)?.name ?? "Unknown",
        sku: prodMap.get(i.productId)?.sku ?? "",
        quantity: i.quantity,
        price: Number(i.price),
        discount: Number(i.discount),
        subtotal: Number(i.subtotal),
      })),
      payments: (payMap.get(t.id) ?? []).map((p) => ({ method: p.method, amount: Number(p.amount) })),
      subtotal: Number(t.subtotal),
      discountAmount: Number(t.discountAmount),
      taxAmount: Number(t.taxAmount),
      total: Number(t.total),
      paidAmount: Number(t.paidAmount),
      changeAmount: Number(t.changeAmount),
      status: t.status,
      note: t.note ?? null,
      createdAt: t.createdAt.toISOString(),
    }));

    res.json({ data, total: Number(total), page: pageNum, limit: limitNum });
  })
);

// ─── POST /api/transactions ───────────────────────────────────────────────────
router.post(
  "/transactions",
  requireRole(...CASHIER_ROLES),
  asyncHandler(async (req, res): Promise<void> => {
    const { customerId, shiftId, items, payments, note, taxRate = 0 } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items wajib diisi dan tidak boleh kosong" });
      return;
    }
    if (!Array.isArray(payments) || payments.length === 0) {
      res.status(400).json({ error: "payments wajib diisi" });
      return;
    }

    // cashierId diambil dari token, BUKAN dari body request
    const cashierId = req.user!.id;

    // Gunakan DB transaction untuk atomicity
    const result = await db.transaction(async (tx) => {
      let subtotal = 0;
      const itemsWithProducts = [];

      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          throw new Error(`Item tidak valid: productId dan quantity > 0 diperlukan`);
        }

        const [product] = await tx
          .select()
          .from(productsTable)
          .where(eq(productsTable.id, item.productId));

        if (!product) {
          throw Object.assign(new Error(`Produk ID ${item.productId} tidak ditemukan`), { status: 404 });
        }
        if (!product.isActive) {
          throw Object.assign(new Error(`Produk '${product.name}' tidak aktif`), { status: 400 });
        }
        if (product.stock < item.quantity) {
          throw Object.assign(
            new Error(`Stok '${product.name}' tidak cukup. Tersedia: ${product.stock}, diminta: ${item.quantity}`),
            { status: 400 }
          );
        }

        const itemSubtotal = (item.price * item.quantity) - (item.discount ?? 0);
        subtotal += itemSubtotal;
        itemsWithProducts.push({ ...item, product, subtotal: itemSubtotal });
      }

      const taxAmount = subtotal * (Number(taxRate) / 100);
      const total = subtotal + taxAmount;
      const paidAmount = payments.reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);
      const changeAmount = paidAmount - total;

      if (paidAmount < total) {
        throw Object.assign(
          new Error(`Jumlah bayar (${paidAmount}) kurang dari total (${total.toFixed(0)})`),
          { status: 400 }
        );
      }

      const receiptNumber = `TRX${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;

      const [newTx] = await tx
        .insert(transactionsTable)
        .values({
          receiptNumber,
          customerId: customerId ?? null,
          cashierId,
          shiftId: shiftId ?? null,
          subtotal: String(subtotal),
          discountAmount: "0",
          taxAmount: String(taxAmount),
          total: String(total),
          paidAmount: String(paidAmount),
          changeAmount: String(Math.max(0, changeAmount)),
          status: "completed",
          note: note ?? null,
        })
        .returning();

      for (const item of itemsWithProducts) {
        await tx.insert(transactionItemsTable).values({
          transactionId: newTx.id,
          productId: item.productId,
          quantity: item.quantity,
          price: String(item.price),
          discount: String(item.discount ?? 0),
          subtotal: String(item.subtotal),
        });

        const newStock = item.product.stock - item.quantity;
        await tx
          .update(productsTable)
          .set({ stock: newStock })
          .where(eq(productsTable.id, item.product.id));

        await tx.insert(stockMovementsTable).values({
          productId: item.product.id,
          type: "sale",
          quantity: -item.quantity,
          before: item.product.stock,
          after: newStock,
          transactionId: newTx.id,
          createdBy: String(cashierId),
        });
      }

      for (const payment of payments) {
        await tx.insert(transactionPaymentsTable).values({
          transactionId: newTx.id,
          method: payment.method,
          amount: String(payment.amount),
        });
      }

      // Update shift jika ada
      if (shiftId) {
        const [shift] = await tx.select().from(shiftsTable).where(eq(shiftsTable.id, shiftId));
        if (shift) {
          await tx
            .update(shiftsTable)
            .set({
              totalTransactions: shift.totalTransactions + 1,
              totalRevenue: String(Number(shift.totalRevenue) + total),
            })
            .where(eq(shiftsTable.id, shiftId));
        }
      }

      // Update customer stats jika ada
      if (customerId) {
        const [customer] = await tx.select().from(customersTable).where(eq(customersTable.id, customerId));
        if (customer) {
          const newTotal = Number(customer.totalSpent) + total;
          const newTxCount = customer.totalTransactions + 1;
          const newPoints = customer.points + Math.floor(total / 10000);
          let tier = "regular";
          if (newTotal >= 10000000) tier = "platinum";
          else if (newTotal >= 5000000) tier = "gold";
          else if (newTotal >= 1000000) tier = "silver";
          await tx
            .update(customersTable)
            .set({ totalSpent: String(newTotal), totalTransactions: newTxCount, points: newPoints, tier })
            .where(eq(customersTable.id, customerId));
        }
      }

      return newTx;
    });

    req.log.info({ txId: result.id, cashierId, total: result.total }, "Transaksi berhasil dibuat");
    res.status(201).json(await buildTransactionResponse(result));
  })
);

// ─── GET /api/transactions/:id ────────────────────────────────────────────────
router.get(
  "/transactions/:id",
  requireRole(...ALL_STAFF),
  asyncHandler(async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }
    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
    if (!tx) { res.status(404).json({ error: "Transaksi tidak ditemukan" }); return; }
    res.json(await buildTransactionResponse(tx));
  })
);

// ─── POST /api/transactions/:id/void ─────────────────────────────────────────
router.post(
  "/transactions/:id/void",
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

    const { reason } = req.body;
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      res.status(400).json({ error: "Alasan void wajib diisi" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(transactionsTable).where(eq(transactionsTable.id, id));
      if (!existing) throw Object.assign(new Error("Transaksi tidak ditemukan"), { status: 404 });

      if (existing.status !== "completed") {
        throw Object.assign(
          new Error(`Transaksi tidak dapat divoid karena status saat ini adalah '${existing.status}'`),
          { status: 400 }
        );
      }

      const items = await tx.select().from(transactionItemsTable).where(eq(transactionItemsTable.transactionId, id));
      for (const item of items) {
        const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, item.productId));
        if (product) {
          const newStock = product.stock + item.quantity;
          await tx.update(productsTable).set({ stock: newStock }).where(eq(productsTable.id, product.id));
          await tx.insert(stockMovementsTable).values({
            productId: product.id,
            type: "return",
            quantity: item.quantity,
            before: product.stock,
            after: newStock,
            note: `Void transaksi #${id}: ${reason}`,
            createdBy: String(req.user!.id),
          });
        }
      }

      const [updated] = await tx
        .update(transactionsTable)
        .set({ status: "voided", voidReason: reason })
        .where(eq(transactionsTable.id, id))
        .returning();

      return updated;
    });

    req.log.warn({ txId: id, voidedBy: req.user!.id, reason }, "Transaksi divoid");
    res.json(await buildTransactionResponse(result));
  })
);

// ─── POST /api/transactions/:id/return ───────────────────────────────────────
router.post(
  "/transactions/:id/return",
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

    const { items: returnItems, reason } = req.body;
    if (!Array.isArray(returnItems) || returnItems.length === 0) {
      res.status(400).json({ error: "items return wajib diisi" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(transactionsTable).where(eq(transactionsTable.id, id));
      if (!existing) throw Object.assign(new Error("Transaksi tidak ditemukan"), { status: 404 });
      if (existing.status === "voided") {
        throw Object.assign(new Error("Transaksi yang sudah divoid tidak dapat di-return"), { status: 400 });
      }

      for (const ri of returnItems) {
        const [txItem] = await tx.select().from(transactionItemsTable).where(eq(transactionItemsTable.id, ri.transactionItemId));
        if (txItem) {
          const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, txItem.productId));
          if (product) {
            const newStock = product.stock + ri.quantity;
            await tx.update(productsTable).set({ stock: newStock }).where(eq(productsTable.id, product.id));
            await tx.insert(stockMovementsTable).values({
              productId: product.id,
              type: "return",
              quantity: ri.quantity,
              before: product.stock,
              after: newStock,
              note: `Return transaksi #${id}: ${reason ?? ""}`,
              createdBy: String(req.user!.id),
            });
          }
        }
      }

      const [updated] = await tx
        .update(transactionsTable)
        .set({ status: "returned" })
        .where(eq(transactionsTable.id, id))
        .returning();

      return updated;
    });

    req.log.info({ txId: id, returnedBy: req.user!.id }, "Transaksi di-return");
    res.json(await buildTransactionResponse(result));
  })
);

export default router;
