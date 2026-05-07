import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MOCK_PASSWORD = "admin123";

function generateToken(userId: number, role: string): string {
  const payload = { id: userId, role, iat: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function parseToken(token: string): { id: number; role: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (typeof decoded.id === "number" && typeof decoded.role === "string") {
      return { id: decoded.id, role: decoded.role };
    }
    return null;
  } catch {
    return null;
  }
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (password !== MOCK_PASSWORD && password !== user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = generateToken(user.id, user.role);
  req.log.info({ userId: user.id, role: user.role }, "User logged in");
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
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = parseToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.id));
  if (!user) {
    res.status(401).json({ error: "User not found" });
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
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out" });
});

export { parseToken };
export default router;
