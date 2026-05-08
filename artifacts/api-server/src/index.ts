import app from "./app";
import { logger } from "./lib/logger";

// ─── Validasi environment variables wajib saat startup ───────────────────────
const REQUIRED_ENV = ["PORT", "JWT_SECRET", "DATABASE_URL"] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.error(`Environment variable '${key}' wajib diset. Server tidak dapat berjalan.`);
    process.exit(1);
  }
}

const rawPort = process.env["PORT"]!;
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0 || port > 65535) {
  logger.error(`Nilai PORT tidak valid: "${rawPort}"`);
  process.exit(1);
}

// Validasi JWT_SECRET harus cukup panjang
if (process.env["JWT_SECRET"]!.length < 32) {
  logger.error("JWT_SECRET terlalu pendek. Minimal 32 karakter untuk keamanan.");
  process.exit(1);
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string) {
  logger.info({ signal }, "Menerima sinyal shutdown, menutup server...");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — server akan berhenti");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection — server akan berhenti");
  process.exit(1);
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error saat listen pada port");
    process.exit(1);
  }
  logger.info(
    {
      port,
      env: process.env.NODE_ENV ?? "development",
      corsOrigins: process.env["ALLOWED_ORIGINS"] ?? "* (dev mode)",
    },
    "Server berjalan"
  );
});
