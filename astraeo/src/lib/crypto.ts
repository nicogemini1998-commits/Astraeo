import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * AES-256-GCM encryption helper for sensitive data at rest (API keys, tokens).
 *
 * Uses a server-side master key derived from APP_SECRET via scrypt, with a
 * unique random IV per ciphertext. Output format: base64(iv | tag | ciphertext).
 *
 * Set APP_SECRET in env (>= 32 chars). Rotating it invalidates existing ciphertexts.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;     // GCM standard
const TAG_LEN = 16;    // 128-bit auth tag
const KEY_LEN = 32;    // 256-bit key
const SALT = Buffer.from("astraeo-static-salt-v1"); // static salt — secret entropy is in APP_SECRET

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_SECRET env var missing or shorter than 32 chars");
  }
  cachedKey = scryptSync(secret, SALT, KEY_LEN);
  return cachedKey;
}

export function encrypt(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN) throw new Error("Ciphertext too short");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Constant-time string compare. Use for token/secret equality checks. */
export function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
