import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";

export interface AuthPayload {
  id: number;
  role: string;
  username: string;
}

// Extend Express Request to include auth user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required but not set.");
  }
  return secret;
}

/**
 * Middleware: verifikasi JWT token dari header Authorization.
 * Menyimpan payload ke req.user jika valid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: token tidak ditemukan" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    logger.warn({ err }, "JWT verification failed");
    res.status(401).json({ error: "Unauthorized: token tidak valid atau sudah expired" });
  }
}

/**
 * Middleware factory: memastikan user memiliki salah satu dari role yang diizinkan.
 * Harus digunakan setelah requireAuth.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: role '${req.user.role}' tidak memiliki akses ke endpoint ini`,
      });
      return;
    }
    next();
  };
}

// Shorthand role groups
export const ADMIN_ROLES = ["super_admin", "admin"];
export const MANAGER_ROLES = ["super_admin", "admin", "accountant"];
export const CASHIER_ROLES = ["super_admin", "admin", "cashier"];
export const WAREHOUSE_ROLES = ["super_admin", "admin", "warehouse"];
export const ALL_STAFF = ["super_admin", "admin", "cashier", "warehouse", "accountant"];
