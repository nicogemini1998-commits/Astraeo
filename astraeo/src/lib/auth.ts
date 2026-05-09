import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

/**
 * Server-side authentication helpers.
 *
 * Required env:
 *   AUTH_SECRET     — 32+ char random string for JWT signing
 *   AUTH_USER       — username (e.g. "nicolas")
 *   AUTH_PASS_HASH  — bcrypt hash of password (run scripts/hash-password.mjs)
 *
 * If AUTH_PASS_HASH is missing, falls back to comparing AUTH_PASS in plaintext
 * (only for first-run setup; warning logged).
 */

const COOKIE_NAME = "astraeo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

let secretKey: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (secretKey) return secretKey;
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET env var missing or < 32 chars");
  secretKey = new TextEncoder().encode(s);
  return secretKey;
}

export interface SessionPayload {
  sub: string;        // user identifier
  iat: number;
  exp: number;
}

export async function verifyCredentials(user: string, pass: string): Promise<boolean> {
  const expectedUser = process.env.AUTH_USER ?? "nicolas";
  if (user !== expectedUser) return false;

  const hash = process.env.AUTH_PASS_HASH;
  if (hash) return bcrypt.compare(pass, hash);

  // Fallback for first-run only — warn loudly
  const fallback = process.env.AUTH_PASS;
  if (fallback) {
    console.warn("[auth] Using AUTH_PASS plaintext fallback. Generate AUTH_PASS_HASH ASAP.");
    return pass === fallback;
  }
  return false;
}

export async function issueSession(sub: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export const AUTH_COOKIE = {
  name: COOKIE_NAME,
  ttl: SESSION_TTL_SECONDS,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  },
};
