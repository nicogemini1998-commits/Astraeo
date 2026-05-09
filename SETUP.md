# Setup Local Development

## Quick Start (Docker)

```bash
# 1. Clone repo
git clone https://github.com/nicogemini1998-commits/Astraeo.git
cd "Astraeo"

# 2. Create .env from example
cp astraeo/.env.example astraeo/.env

# 3. Generate required secrets
# Auth password hash (use any password):
node astraeo/scripts/hash-password.mjs 'YourPassword'
# Copy bcrypt hash → AUTH_PASS_HASH in .env

# JWT secret:
openssl rand -base64 48
# Copy → AUTH_SECRET in .env

# App encryption key:
openssl rand -base64 48
# Copy → APP_SECRET in .env

# 4. Update .env for Docker
# Change these lines:
# DATABASE_URL="postgresql://astraeo:astraeo-dev@postgres:5432/astraeo_db"
# REDIS_URL="redis://redis:6379"

# 5. Start services
docker compose up -d

# 6. Wait for healthy containers
docker compose ps

# 7. Open app
# http://localhost:3002
# Login: nicolas / your-password-from-step-3
```

## First Login

1. Navigate to http://localhost:3002
2. Use credentials from .env (AUTH_USER / password from step 3 above)
3. Go to Settings → App Configuration
4. Add ANTHROPIC_API_KEY from your Anthropic account

## Local Development (No Docker)

```bash
# Install dependencies
cd astraeo
npm install

# Start PostgreSQL and Redis (separately or via Docker)
docker run -d --name postgres -e POSTGRES_PASSWORD=astraeo-dev -p 5432:5432 postgres:16
docker run -d --name redis -p 6379:6379 redis:7

# Setup database
npx prisma migrate dev

# Start dev server
npm run dev
```

## Database

- **Host:** postgres (Docker) or localhost (local)
- **User:** astraeo
- **Password:** astraeo-dev
- **Database:** astraeo_db

## Redis

- **Host:** redis (Docker) or localhost (local)
- **Port:** 6379

## Troubleshooting

**libssl.so.1.1 error:** Dockerfile installs OpenSSL 1.1 — rebuild image
```bash
docker compose build --no-cache
docker compose up -d
```

**Port conflicts:** Change docker-compose.yml ports (3002 → 3003, etc.)

**Database not ready:** Check logs
```bash
docker compose logs postgres
```
