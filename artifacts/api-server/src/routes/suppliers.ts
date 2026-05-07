import { Router, type IRouter } from "express";
import { db, suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function toApi(s: typeof suppliersTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    contact: s.contact ?? null,
    phone: s.phone ?? null,
    email: s.email ?? null,
    address: s.address ?? null,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/suppliers", async (_req, res): Promise<void> => {
  const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
  res.json(suppliers.map(toApi));
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const { name, contact, phone, email, address } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [s] = await db.insert(suppliersTable).values({ name, contact: contact ?? null, phone: phone ?? null, email: email ?? null, address: address ?? null }).returning();
  res.status(201).json(toApi(s));
});

router.patch("/suppliers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, contact, phone, email, address, isActive } = req.body;
  const updates: Partial<typeof suppliersTable.$inferInsert> = {};
  if (name != null) updates.name = name;
  if (contact != null) updates.contact = contact;
  if (phone != null) updates.phone = phone;
  if (email != null) updates.email = email;
  if (address != null) updates.address = address;
  if (isActive != null) updates.isActive = isActive;
  const [s] = await db.update(suppliersTable).set(updates).where(eq(suppliersTable.id, id)).returning();
  if (!s) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(toApi(s));
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
  res.sendStatus(204);
});

export default router;
