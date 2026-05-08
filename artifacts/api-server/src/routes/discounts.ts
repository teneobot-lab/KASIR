import { Router, type IRouter } from "express";
import { db, discountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, ADMIN_ROLES, MANAGER_ROLES, ALL_STAFF } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";

const router: IRouter = Router();
router.use(requireAuth);

function toApi(d: typeof discountsTable.$inferSelect) {
  return {
    id: d.id,
    name: d.name,
    code: d.code ?? null,
    type: d.type,
    value: Number(d.value),
    minPurchase: d.minPurchase != null ? Number(d.minPurchase) : null,
    maxDiscount: d.maxDiscount != null ? Number(d.maxDiscount) : null,
    startDate: d.startDate ?? null,
    endDate: d.endDate ?? null,
    usageLimit: d.usageLimit ?? null,
    usageCount: d.usageCount,
    isActive: d.isActive,
    createdAt: d.createdAt.toISOString(),
  };
}

router.get("/discounts", async (_req, res): Promise<void> => {
  const discounts = await db.select().from(discountsTable).orderBy(discountsTable.name);
  res.json(discounts.map(toApi));
});

router.post("/discounts", async (req, res): Promise<void> => {
  const { name, code, type, value, minPurchase, maxDiscount, startDate, endDate, usageLimit, isActive } = req.body;
  if (!name || !type || value == null) { res.status(400).json({ error: "name, type, value required" }); return; }
  const [d] = await db.insert(discountsTable).values({
    name, code: code ?? null, type, value: String(value),
    minPurchase: minPurchase != null ? String(minPurchase) : null,
    maxDiscount: maxDiscount != null ? String(maxDiscount) : null,
    startDate: startDate ?? null, endDate: endDate ?? null,
    usageLimit: usageLimit ?? null, usageCount: 0, isActive: isActive ?? true,
  }).returning();
  res.status(201).json(toApi(d));
});

router.patch("/discounts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const body = req.body;
  const updates: Partial<typeof discountsTable.$inferInsert> = {};
  if (body.name != null) updates.name = body.name;
  if (body.code != null) updates.code = body.code;
  if (body.type != null) updates.type = body.type;
  if (body.value != null) updates.value = String(body.value);
  if (body.minPurchase != null) updates.minPurchase = String(body.minPurchase);
  if (body.maxDiscount != null) updates.maxDiscount = String(body.maxDiscount);
  if (body.startDate != null) updates.startDate = body.startDate;
  if (body.endDate != null) updates.endDate = body.endDate;
  if (body.usageLimit != null) updates.usageLimit = body.usageLimit;
  if (body.isActive != null) updates.isActive = body.isActive;
  const [d] = await db.update(discountsTable).set(updates).where(eq(discountsTable.id, id)).returning();
  if (!d) { res.status(404).json({ error: "Discount not found" }); return; }
  res.json(toApi(d));
});

router.delete("/discounts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(discountsTable).where(eq(discountsTable.id, id));
  res.sendStatus(204);
});

router.post("/discounts/validate", async (req, res): Promise<void> => {
  const { code, subtotal } = req.body;
  if (!code) { res.status(400).json({ error: "code required" }); return; }
  const [discount] = await db.select().from(discountsTable).where(eq(discountsTable.code, code));
  if (!discount || !discount.isActive) {
    res.json({ valid: false, discountAmount: 0, discount: null, message: "Kode tidak valid atau tidak aktif" });
    return;
  }
  const now = new Date().toISOString().slice(0, 10);
  if (discount.startDate && now < discount.startDate) {
    res.json({ valid: false, discountAmount: 0, discount: null, message: "Promo belum dimulai" });
    return;
  }
  if (discount.endDate && now > discount.endDate) {
    res.json({ valid: false, discountAmount: 0, discount: null, message: "Promo sudah berakhir" });
    return;
  }
  if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
    res.json({ valid: false, discountAmount: 0, discount: null, message: "Batas penggunaan sudah tercapai" });
    return;
  }
  if (discount.minPurchase && subtotal < Number(discount.minPurchase)) {
    res.json({ valid: false, discountAmount: 0, discount: null, message: `Minimum pembelian Rp ${Number(discount.minPurchase).toLocaleString("id-ID")}` });
    return;
  }
  let amount = 0;
  if (discount.type === "percentage") {
    amount = (subtotal * Number(discount.value)) / 100;
    if (discount.maxDiscount) amount = Math.min(amount, Number(discount.maxDiscount));
  } else if (discount.type === "fixed") {
    amount = Number(discount.value);
  }
  res.json({ valid: true, discountAmount: amount, discount: toApi(discount), message: null });
});

export default router;
