import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash password menggunakan bcrypt dengan 12 salt rounds.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Bandingkan password plain dengan hash yang tersimpan.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
