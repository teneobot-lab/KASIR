import { Router, type IRouter } from "express";
import { db, customersTable, transactionsTable, transactionItemsTable, transactionPaymentsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function toApi(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? null,
    email: c.email ?? null,
    address: c.address ?? null,
    memberCode: c.memberCode ?? null,
    tier: c.tier,
    points: c.points,
    totalSpent: Number(c.totalSpent),
    totalTransactions: c.totalTransactions,
    birthdate: c.birthdate ?? null,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
  };
}

function generateMemberCode(): string {
  return "MBR" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, "0");
}

router.get("/customers", async (req, res): Promise<void> => {
  const { search, tier, page = "1", limit = "20" } = req.query as Record<string, string>;
  let customers = await db.select().from(customersTable).orderBy(desc(customersTable.createdAt));
  if (search) {
    const s = search.toLowerCase();
    customers = customers.filter((c) => c.name.toLowerCase().includes(s) || (c.phone ?? "").includes(s) || (c.email ?? "").toLowerCase().includes(s));
  }
  if (tier) customers = customers.filter((c) => c.tier === tier);
  const total = customers.length;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const paged = customers.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({ data: paged.map(toApi), total, page: pageNum, limit: limitNum });
});

router.post("/customers", async (req, res): Promise<void> => {
  const { name, phone, email, address, birthdate } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [c] = await db.insert(customersTable).values({
    name, phone: phone ?? null, email: email ?? null, address: address ?? null,
    birthdate: birthdate ?? null, memberCode: generateMemberCode(),
    tier: "regular", points: 0, totalSpent: "0", totalTransactions: 0, isActive: true,
  }).returning();
  res.status(201).json(toApi(c));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [c] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!c) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(toApi(c));
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, phone, email, address, birthdate, isActive } = req.body;
  const updates: Partial<typeof customersTable.$inferInsert> = {};
  if (name != null) updates.name = name;
  if (phone != null) updates.phone = phone;
  if (email != null) updates.email = email;
  if (address != null) updates.address = address;
  if (birthdate != null) updates.birthdate = birthdate;
  if (isActive != null) updates.isActive = isActive;
  const [c] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
  if (!c) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(toApi(c));
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(customersTable).where(eq(customersTable.id, id));
  res.sendStatus(204);
});

router.get("/customers/:id/transactions", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.customerId, id)).orderBy(desc(transactionsTable.createdAt));
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const txIds = transactions.map((t) => t.id);
  let items: typeof transactionItemsTable.$inferSelect[] = [];
  let payments: typeof transactionPaymentsTable.$inferSelect[] = [];
  if (txIds.length > 0) {
    items = await db.select().from(transactionItemsTable);
    payments = await db.select().from(transactionPaymentsTable);
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  res.json(transactions.map((t) => ({
    id: t.id,
    receiptNumber: t.receiptNumber,
    customerId: t.customerId ?? null,
    customerName: customer?.name ?? null,
    cashierId: t.cashierId,
    cashierName: userMap.get(t.cashierId) ?? "Unknown",
    shiftId: t.shiftId ?? null,
    items: items.filter((i) => i.transactionId === t.id).map((i) => ({
      id: i.id, productId: i.productId, productName: "", sku: "",
      quantity: i.quantity, price: Number(i.price), discount: Number(i.discount), subtotal: Number(i.subtotal),
    })),
    payments: payments.filter((p) => p.transactionId === t.id).map((p) => ({ method: p.method, amount: Number(p.amount) })),
    subtotal: Number(t.subtotal), discountAmount: Number(t.discountAmount), taxAmount: Number(t.taxAmount),
    total: Number(t.total), paidAmount: Number(t.paidAmount), changeAmount: Number(t.changeAmount),
    status: t.status, note: t.note ?? null, createdAt: t.createdAt.toISOString(),
  })));
});

export default router;
