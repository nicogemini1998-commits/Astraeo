# Security & Backend Posture

## What's enforced

| Layer | Mechanism | File |
|---|---|---|
| HTTP headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | `next.config.ts` |
| Auth | bcrypt-hashed credentials, JWT (HS256, jose), httpOnly + sameSite=lax cookie, 7-day TTL | `src/lib/auth.ts`, `src/app/api/auth/*` |
| Rate limiting | Redis token-bucket (atomic Lua), `auth` bucket = 5 attempts then 1/20s | `src/lib/rate-limit.ts` |
| Input validation | Zod schemas on every API route | `src/app/api/*/route.ts` |
| Secrets at rest | AES-256-GCM via `APP_SECRET`-derived key (scrypt) | `src/lib/crypto.ts` |
| Audit log | Every auth event + sensitive mutation persisted to `audit_log` table | `src/lib/audit.ts`, Prisma model `AuditLog` |
| Backups | Daily `pg_dump` with rotation (7 daily + weekly + monthly) | `scripts/backup.sh` |
| Restore | One-command restore with confirmation prompt | `scripts/restore.sh` |
| DB | PostgreSQL via Prisma; no raw SQL string concat | `prisma/schema.prisma` |
| Errors | Unified handler — never leaks stack traces | `src/lib/errors.ts` |
| Settings API | API key never returned in GET responses | `src/app/api/settings/route.ts` |

## Required environment variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/astraeo

# Redis (rate-limit + caching)
REDIS_URL=redis://default:pass@host:6379

# Auth — generate hash with: node scripts/hash-password.mjs 'YourPassword'
AUTH_USER=nicolas
AUTH_PASS_HASH=$2a$12$...

# JWT signing — at least 32 random chars
AUTH_SECRET=<openssl rand -base64 48>

# Encryption key for at-rest secrets (API keys, tokens) — at least 32 chars
APP_SECRET=<openssl rand -base64 48>

# Optional fallback for first-run only (remove after AUTH_PASS_HASH is set)
# AUTH_PASS=Master123
```

## First-time setup

```bash
# 1. Generate secrets
openssl rand -base64 48     # → AUTH_SECRET
openssl rand -base64 48     # → APP_SECRET
node scripts/hash-password.mjs 'Master123'   # → AUTH_PASS_HASH

# 2. Apply DB migrations
npx prisma migrate deploy

# 3. Schedule backups (crontab -e)
0 3 * * * cd /srv/astraeo && bash scripts/backup.sh >> backups/backup.log 2>&1
```

## Backup retention

- 7 most recent daily backups (always)
- All Sundays beyond day 7 → weekly retention
- All 1st-of-month beyond day 7 → monthly retention (effectively 12 months)
- Everything else is pruned automatically

## Restore

```bash
DATABASE_URL=... bash scripts/restore.sh backups/astraeo-2026-05-09-0300.sql.gz
# Prompts "YES" to confirm before replacing data.
```

## Audit log

Every auth event (`auth.login.success`, `auth.login.fail`, `auth.logout`) and
sensitive mutation lands in `audit_log` with: `action`, `entity`, `entityId`,
`userId`, `ip`, `userAgent`, `meta`, `createdAt`.

Query examples:

```sql
-- Failed logins last 24h by IP
SELECT ip, count(*) FROM audit_log
WHERE action = 'auth.login.fail' AND created_at > now() - interval '1 day'
GROUP BY ip ORDER BY count DESC;

-- Who modified settings recently
SELECT user_id, created_at, meta FROM audit_log
WHERE entity = 'settings' AND action LIKE '%.write'
ORDER BY created_at DESC LIMIT 50;
```

## What's still recommended for hardened production

- Move from server-static credentials to a real IdP (Auth0, Clerk, Workos)
  for multi-user + MFA + SSO
- Add Sentry/Datadog APM for error visibility beyond audit_log
- Enable Postgres `log_statement=ddl` + connection pooler (PgBouncer)
- WAF in front (Cloudflare / Fastly) for DDoS + bot mitigation
- Encrypted off-site backup mirror (S3 + SSE-KMS, Backblaze B2 + lifecycle)
- Periodic restore drill (quarterly) to validate backups actually work
