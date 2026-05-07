import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";

const router: IRouter = Router();

function toApi(p: typeof productsTable.$inferSelect, categoryName?: string | null) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode ?? null,
    description: p.description ?? null,
    categoryId: p.categoryId ?? null,
    categoryName: categoryName ?? null,
    price: Number(p.price),
    costPrice: p.costPrice != null ? Number(p.costPrice) : null,
    memberPrice: p.memberPrice != null ? Number(p.memberPrice) : null,
    wholesalePrice: p.wholesalePrice != null ? Number(p.wholesalePrice) : null,
    stock: p.stock,
    minStock: p.minStock,
    unit: p.unit,
    imageUrl: p.imageUrl ?? null,
    isActive: p.isActive,
    supplierId: p.supplierId ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/products/search", async (req, res): Promise<void> => {
  const q = (req.query.q as string) || "";
  const products = await db.select().from(productsTable).where(
    and(
      eq(productsTable.isActive, true),
      sql`(${productsTable.name} ILIKE ${"%" + q + "%"} OR ${productsTable.sku} ILIKE ${"%" + q + "%"} OR ${productsTable.barcode} ILIKE ${"%" + q + "%"})`
    )
  ).limit(20);
  res.json(products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode ?? null,
    price: Number(p.price),
    memberPrice: p.memberPrice != null ? Number(p.memberPrice) : null,
    stock: p.stock,
    unit: p.unit,
    imageUrl: p.imageUrl ?? null,
  })));
});

router.get("/products", async (req, res): Promise<void> => {
  const { search, categoryId, lowStock, page = "1", limit = "20" } = req.query as Record<string, string>;
  let allProducts = await db.select().from(productsTable).orderBy(productsTable.name);
  if (search) {
    const s = search.toLowerCase();
    allProducts = allProducts.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
  }
  if (categoryId) allProducts = allProducts.filter((p) => p.categoryId === parseInt(categoryId, 10));
  if (lowStock === "true") allProducts = allProducts.filter((p) => p.stock <= p.minStock);
  const total = allProducts.length;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const paged = allProducts.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  const categories = await db.select().from(categoriesTable);
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  res.json({ data: paged.map((p) => toApi(p, catMap.get(p.categoryId ?? -1))), total, page: pageNum, limit: limitNum });
});

router.post("/products", async (req, res): Promise<void> => {
  const { name, sku, barcode, description, categoryId, price, costPrice, memberPrice, wholesalePrice, stock, minStock, unit, imageUrl, supplierId } = req.body;
  if (!name || !sku || price == null) { res.status(400).json({ error: "name, sku, price required" }); return; }
  const [p] = await db.insert(productsTable).values({
    name, sku, barcode: barcode ?? null, description: description ?? null,
    categoryId: categoryId ?? null, supplierId: supplierId ?? null,
    price: String(price), costPrice: costPrice != null ? String(costPrice) : null,
    memberPrice: memberPrice != null ? String(memberPrice) : null,
    wholesalePrice: wholesalePrice != null ? String(wholesalePrice) : null,
    stock: stock ?? 0, minStock: minStock ?? 5, unit: unit ?? "pcs",
    imageUrl: imageUrl ?? null, isActive: true,
  }).returning();
  res.status(201).json(toApi(p));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!p) { res.status(404).json({ error: "Product not found" }); return; }
  let catName: string | null = null;
  if (p.categoryId) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, p.categoryId));
    catName = cat?.name ?? null;
  }
  res.json(toApi(p, catName));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const body = req.body;
  const updates: Partial<typeof productsTable.$inferInsert> = {};
  if (body.name != null) updates.name = body.name;
  if (body.sku != null) updates.sku = body.sku;
  if (body.barcode != null) updates.barcode = body.barcode;
  if (body.description != null) updates.description = body.description;
  if (body.categoryId != null) updates.categoryId = body.categoryId;
  if (body.price != null) updates.price = String(body.price);
  if (body.costPrice != null) updates.costPrice = String(body.costPrice);
  if (body.memberPrice != null) updates.memberPrice = String(body.memberPrice);
  if (body.wholesalePrice != null) updates.wholesalePrice = String(body.wholesalePrice);
  if (body.minStock != null) updates.minStock = body.minStock;
  if (body.unit != null) updates.unit = body.unit;
  if (body.imageUrl != null) updates.imageUrl = body.imageUrl;
  if (body.isActive != null) updates.isActive = body.isActive;
  const [p] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
  if (!p) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(toApi(p));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.sendStatus(204);
});

export default router;
