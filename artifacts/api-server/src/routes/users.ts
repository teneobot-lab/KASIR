import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, ADMIN_ROLES } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";
import { hashPassword } from "../lib/password";

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
    // passwordHash TIDAK dikembalikan ke client
  };
}

// Semua endpoint user memerlukan login + role admin
router.use(requireAuth, requireRole(...ADMIN_ROLES));

router.get(
  "/users",
  asyncHandler(async (req, res): Promise<void> => {
    const { role, search } = req.query as { role?: string; search?: string };
    let users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    if (role) users = users.filter((u) => u.role === role);
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(s) ||
          u.username.toLowerCase().includes(s)
      );
    }
    res.json(users.map(userToApi));
  })
);

router.post(
  "/users",
  asyncHandler(async (req, res): Promise<void> => {
    const { username, name, email, password, role } = req.body as {
      username?: unknown;
      name?: unknown;
      email?: unknown;
      password?: unknown;
      role?: unknown;
    };

    if (
      typeof username !== "string" || !username.trim() ||
      typeof name !== "string" || !name.trim() ||
      typeof password !== "string" || !password ||
      typeof role !== "string" || !role
    ) {
      res.status(400).json({ error: "username, name, password, role wajib diisi" });
      return;
    }

    if ((password as string).length < 8) {
      res.status(400).json({ error: "Password minimal 8 karakter" });
      return;
    }

    const VALID_ROLES = ["super_admin", "admin", "cashier", "warehouse", "accountant"];
    if (!VALID_ROLES.includes(role)) {
      res.status(400).json({ error: `Role tidak valid. Pilihan: ${VALID_ROLES.join(", ")}` });
      return;
    }

    // Cek duplikat username
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username.trim()));
    if (existing) {
      res.status(409).json({ error: "Username sudah digunakan" });
      return;
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(usersTable)
      .values({
        username: username.trim(),
        name: name.trim(),
        email: typeof email === "string" && email ? email : null,
        passwordHash,
        role,
        isActive: true,
      })
      .returning();

    req.log.info({ createdBy: req.user!.id, newUserId: user.id }, "User baru dibuat");
    res.status(201).json(userToApi(user));
  })
);

router.get(
  "/users/:id",
  asyncHandler(async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) { res.status(404).json({ error: "User tidak ditemukan" }); return; }
    res.json(userToApi(user));
  })
);

router.patch(
  "/users/:id",
  asyncHandler(async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

    const { name, email, role, isActive, password } = req.body;
    const updates: Partial<typeof usersTable.$inferInsert> = {};

    if (name != null) updates.name = name;
    if (email != null) updates.email = email;
    if (role != null) updates.role = role;
    if (isActive != null) updates.isActive = isActive;

    // Hanya super_admin boleh reset password user lain
    if (password != null) {
      if (req.user!.role !== "super_admin" && req.user!.id !== id) {
        res.status(403).json({ error: "Hanya super_admin yang dapat mereset password user lain" });
        return;
      }
      if (typeof password !== "string" || password.length < 8) {
        res.status(400).json({ error: "Password minimal 8 karakter" });
        return;
      }
      updates.passwordHash = await hashPassword(password);
    }

    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, id))
      .returning();
    if (!user) { res.status(404).json({ error: "User tidak ditemukan" }); return; }

    req.log.info({ updatedBy: req.user!.id, userId: id }, "User diperbarui");
    res.json(userToApi(user));
  })
);

router.delete(
  "/users/:id",
  requireRole("super_admin"),
  asyncHandler(async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

    // Jangan izinkan hapus diri sendiri
    if (req.user!.id === id) {
      res.status(400).json({ error: "Tidak dapat menghapus akun sendiri" });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, id));
    req.log.warn({ deletedBy: req.user!.id, userId: id }, "User dihapus");
    res.sendStatus(204);
  })
);

export default router;
