import { Router, type IRouter } from "express";
import { db, productsTable, stockMovementsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole, ADMIN_ROLES, MANAGER_ROLES, ALL_STAFF } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/inventory", async (req, res): Promise<void> => {
  const { lowStock, search } = req.query as { lowStock?: string; search?: string };
  let products = await db.select().from(productsTable).orderBy(productsTable.name);
  if (search) {
    const s = search.toLowerCase();
    products = products.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
  }
  if (lowStock === "true") products = products.filter((p) => p.stock <= p.minStock);
  const movements = await db.select().from(stockMovementsTable).orderBy(desc(stockMovementsTable.createdAt));
  const lastMovMap = new Map<number, string>();
  for (const m of movements) {
    if (!lastMovMap.has(m.productId)) lastMovMap.set(m.productId, m.createdAt.toISOString());
  }
  res.json(products.map((p) => ({
    productId: p.id,
    productName: p.name,
    sku: p.sku,
    stock: p.stock,
    minStock: p.minStock,
    unit: p.unit,
    isLowStock: p.stock <= p.minStock,
    lastMovementAt: lastMovMap.get(p.id) ?? null,
  })));
});

router.get("/inventory/movements", async (req, res): Promise<void> => {
  const { productId, type, from, to } = req.query as { productId?: string; type?: string; from?: string; to?: string };
  let movements = await db.select().from(stockMovementsTable).orderBy(desc(stockMovementsTable.createdAt));
  if (productId) movements = movements.filter((m) => m.productId === parseInt(productId, 10));
  if (type) movements = movements.filter((m) => m.type === type);
  if (from) movements = movements.filter((m) => m.createdAt >= new Date(from));
  if (to) movements = movements.filter((m) => m.createdAt <= new Date(to));
  const productIds = [...new Set(movements.map((m) => m.productId))];
  const products = productIds.length > 0 ? await db.select().from(productsTable) : [];
  const prodMap = new Map(products.map((p) => [p.id, p.name]));
  res.json(movements.map((m) => ({
    id: m.id,
    productId: m.productId,
    productName: prodMap.get(m.productId) ?? "Unknown",
    type: m.type,
    quantity: m.quantity,
    before: m.before,
    after: m.after,
    note: m.note ?? null,
    createdBy: m.createdBy ?? null,
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/inventory/movements", async (req, res): Promise<void> => {
  const { productId, type, quantity, note } = req.body;
  if (!productId || !type || quantity == null) { res.status(400).json({ error: "productId, type, quantity required" }); return; }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  const before = product.stock;
  const after = type === "adjustment" ? quantity : before + quantity;
  const actualQty = after - before;
  await db.update(productsTable).set({ stock: after }).where(eq(productsTable.id, productId));
  const [movement] = await db.insert(stockMovementsTable).values({
    productId, type, quantity: actualQty, before, after, note: note ?? null, createdBy: "system",
  }).returning();
  res.status(201).json({
    id: movement.id,
    productId: movement.productId,
    productName: product.name,
    type: movement.type,
    quantity: movement.quantity,
    before: movement.before,
    after: movement.after,
    note: movement.note ?? null,
    createdBy: movement.createdBy ?? null,
    createdAt: movement.createdAt.toISOString(),
  });
});

router.get("/inventory/alerts", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(productsTable.name);
  const alerts = products.filter((p) => p.stock <= p.minStock);
  res.json(alerts.map((p) => ({
    productId: p.id,
    productName: p.name,
    sku: p.sku,
    stock: p.stock,
    minStock: p.minStock,
    unit: p.unit,
    imageUrl: p.imageUrl ?? null,
  })));
});

export default router;
