import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, and, or } from "drizzle-orm";

const router: IRouter = Router();

function userToApi(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email ?? null,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", async (req, res): Promise<void> => {
  const { role, search } = req.query as { role?: string; search?: string };
  let users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  if (role) users = users.filter((u) => u.role === role);
  if (search) {
    const s = search.toLowerCase();
    users = users.filter((u) => u.name.toLowerCase().includes(s) || u.username.toLowerCase().includes(s));
  }
  res.json(users.map(userToApi));
});

router.post("/users", async (req, res): Promise<void> => {
  const { username, name, email, password, role } = req.body;
  if (!username || !name || !password || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    username,
    name,
    email: email ?? null,
    passwordHash: password,
    role,
    isActive: true,
  }).returning();
  res.status(201).json(userToApi(user));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(userToApi(user));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, email, role, isActive } = req.body;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name != null) updates.name = name;
  if (email != null) updates.email = email;
  if (role != null) updates.role = role;
  if (isActive != null) updates.isActive = isActive;
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(userToApi(user));
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.sendStatus(204);
});

export default router;
