import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";
import { hashPassword, verifyPassword } from "../lib/password";
import { requireAuth, getJwtSecret, type AuthPayload } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/errorHandler";

const router: IRouter = Router();

// ─── Simple in-memory brute-force guard ────────────────────────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

function clearRateLimit(key: string): void {
  loginAttempts.delete(key);
}

// ─── Token factory ──────────────────────────────────────────────────────────
function signToken(user: { id: number; role: string; username: string }): string {
  return jwt.sign(
    { id: user.id, role: user.role, username: user.username } satisfies AuthPayload,
    getJwtSecret(),
    { expiresIn: "8h", issuer: "kasir-enterprise" }
  );
}

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post(
  "/auth/login",
  asyncHandler(async (req, res): Promise<void> => {
    const { username, password } = req.body as { username?: unknown; password?: unknown };

    if (typeof username !== "string" || !username.trim()) {
      res.status(400).json({ error: "Username wajib diisi" });
      return;
    }
    if (typeof password !== "string" || !password) {
      res.status(400).json({ error: "Password wajib diisi" });
      return;
    }

    const ip = req.ip ?? "unknown";
    const rateLimitKey = `${ip}:${username.toLowerCase()}`;

    if (!checkRateLimit(rateLimitKey)) {
      res.status(429).json({
        error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.",
      });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username.trim()));

    // Selalu jalankan verifyPassword agar timing attack tidak efektif
    const dummyHash = "$2a$12$dummyhashfordummycomparisononlyX0000000000000000";
    const passwordOk = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, dummyHash).then(() => false);

    if (!user || !user.isActive || !passwordOk) {
      req.log.warn({ username }, "Login gagal: kredensial tidak valid");
      res.status(401).json({ error: "Username atau password salah" });
      return;
    }

    clearRateLimit(rateLimitKey);

    const token = signToken({ id: user.id, role: user.role, username: user.username });

    req.log.info({ userId: user.id, role: user.role }, "User berhasil login");

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email ?? null,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
    });
  })
);

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res): Promise<void> => {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id));

    if (!user || !user.isActive) {
      res.status(401).json({ error: "User tidak ditemukan atau tidak aktif" });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email ?? null,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    });
  })
);

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post("/auth/logout", requireAuth, (_req, res): void => {
  res.json({ message: "Berhasil logout" });
});

// ─── POST /api/auth/change-password ─────────────────────────────────────────
router.post(
  "/auth/change-password",
  requireAuth,
  asyncHandler(async (req, res): Promise<void> => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      res.status(400).json({ error: "currentPassword dan newPassword wajib diisi" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "Password baru minimal 8 karakter" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id));

    if (!user) {
      res.status(404).json({ error: "User tidak ditemukan" });
      return;
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Password saat ini salah" });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash })
      .where(eq(usersTable.id, user.id));

    req.log.info({ userId: user.id }, "Password berhasil diubah");
    res.json({ message: "Password berhasil diubah" });
  })
);

export default router;
