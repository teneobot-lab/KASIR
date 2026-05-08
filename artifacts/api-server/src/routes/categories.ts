import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, requireRole, ADMIN_ROLES, MANAGER_ROLES, ALL_STAFF } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  const counts = await db.select({ categoryId: productsTable.categoryId, count: count() }).from(productsTable).groupBy(productsTable.categoryId);
  const countMap = new Map(counts.map((c) => [c.categoryId, Number(c.count)]));
  res.json(cats.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    color: c.color ?? null,
    productCount: countMap.get(c.id) ?? 0,
  })));
});

router.post("/categories", async (req, res): Promise<void> => {
  const { name, description, color } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [cat] = await db.insert(categoriesTable).values({ name, description: description ?? null, color: color ?? null }).returning();
  res.status(201).json({ id: cat.id, name: cat.name, description: cat.description ?? null, color: cat.color ?? null, productCount: 0 });
});

router.patch("/categories/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, description, color } = req.body;
  const updates: Partial<typeof categoriesTable.$inferInsert> = {};
  if (name != null) updates.name = name;
  if (description != null) updates.description = description;
  if (color != null) updates.color = color;
  const [cat] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  const [cnt] = await db.select({ count: count() }).from(productsTable).where(eq(productsTable.categoryId, id));
  res.json({ id: cat.id, name: cat.name, description: cat.description ?? null, color: cat.color ?? null, productCount: Number(cnt?.count ?? 0) });
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.sendStatus(204);
});

export default router;
