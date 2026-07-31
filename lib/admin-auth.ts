import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Minimal single-admin auth: one shared password (ADMIN_PASSWORD), one
 * signed session cookie — no user accounts, no database involved in auth
 * itself. Sized for a single business owner running the admin panel
 * (app/admin), not a multi-user system. The signature scheme mirrors
 * app/api/razorpay/verify/route.ts: HMAC-SHA256 + timingSafeEqual, so a
 * forged or tampered cookie can't be crafted without ADMIN_SESSION_SECRET.
 */

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(password);
  // Different-length buffers would throw inside timingSafeEqual — padding
  // the short one keeps the comparison itself constant-time; the length
  // check that follows is what actually decides the (non-secret) outcome.
  if (expectedBuf.length !== actualBuf.length) {
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return timingSafeEqual(expectedBuf, actualBuf);
}

function sign(payload: string): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Returns the cookie value to set, or null if auth isn't configured. */
export function createAdminSessionToken(): string | null {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })).toString(
    "base64url",
  );
  const signature = sign(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  if (!expected) return false;

  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      return false;
    }
  } catch {
    return false;
  }

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

/** Server components / route handlers only — reads the session cookie via
 *  next/headers, never usable from client components. */
export async function isAdminRequestAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value);
}
