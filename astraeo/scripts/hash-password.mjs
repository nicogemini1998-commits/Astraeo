#!/usr/bin/env node
// Generate a bcrypt hash for AUTH_PASS_HASH.
//
// Usage:  node scripts/hash-password.mjs 'YourPasswordHere'
// Output: $2a$12$... (paste into .env as AUTH_PASS_HASH)
import bcrypt from "bcryptjs";

const pass = process.argv[2];
if (!pass) {
  console.error("Usage: node scripts/hash-password.mjs '<password>'");
  process.exit(1);
}
const hash = await bcrypt.hash(pass, 12);
console.log(hash);
