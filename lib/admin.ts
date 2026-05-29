import { createHash, timingSafeEqual } from "crypto";

/**
 * Admin moderation code, used to authorize deleting submissions. The secret is
 * read from the server-only ADMIN_DELETE_CODE environment variable, so it is
 * never shipped to the client bundle and never committed (it lives in
 * .env.local / the host's env settings).
 */
export function isAdminCodeConfigured(): boolean {
  return Boolean(process.env.ADMIN_DELETE_CODE);
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Constant-time comparison of the supplied code against the configured secret.
 * Hashing both sides first keeps the comparison length-independent so we never
 * leak the secret's length through timing.
 */
export function verifyAdminCode(provided: string): boolean {
  const expected = process.env.ADMIN_DELETE_CODE;
  if (!expected) return false;
  return timingSafeEqual(sha256(provided), sha256(expected));
}
