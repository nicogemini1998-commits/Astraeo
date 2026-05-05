# Docker Development Guide

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Port 3002 available (app), 5432 (PostgreSQL), 6379 (Redis)

### Start Development Environment

```bash
# First time only - copy environment file
cp .env.docker astraeo/.env.local

# Start all services (PostgreSQL, Redis, Next.js app)
docker-compose up -d

# Run database migrations
docker-compose exec astraeo npx prisma migrate dev

# View logs
docker-compose logs -f astraeo
```

**App ready at:** `http://localhost:3002`

---

## Services

| Service | Port | URL | Container |
|---------|------|-----|-----------|
| **App** | 3002 | http://localhost:3002 | astraeo-app |
| **PostgreSQL** | 5432 | postgres://astraeo:astraeo-dev@localhost:5432/astraeo_db | astraeo-db |
| **Redis** | 6379 | redis://localhost:6379 | astraeo-cache |

---

## Common Commands

### Development

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart app
docker-compose restart astraeo

# View real-time logs
docker-compose logs -f astraeo

# Interactive shell in app
docker-compose exec astraeo sh
```

### Database

```bash
# Run migrations
docker-compose exec astraeo npx prisma migrate dev

# Reset database (⚠️ destructive)
docker-compose exec astraeo npx prisma migrate reset

# Open Prisma Studio
docker-compose exec astraeo npx prisma studio

# Push schema to database
docker-compose exec astraeo npx prisma db push
```

### Utilities

```bash
# Connect to PostgreSQL directly
docker-compose exec postgres psql -U astraeo -d astraeo_db

# Connect to Redis
docker-compose exec redis redis-cli

# View container resource usage
docker stats
```

---

## Adding Claude API Key

1. Get your API key from https://console.anthropic.com
2. Add to `astraeo/.env.local`:
   ```env
   ANTHROPIC_API_KEY=sk-...
   ```
3. Restart app:
   ```bash
   docker-compose restart astraeo
   ```

---

## Persistence

- **PostgreSQL data:** `postgres_data` volume (persists across restarts)
- **Redis data:** `redis_data` volume
- **App code:** Mounted directly (live reload in development)

To reset all data:
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec astraeo npx prisma migrate dev
```

---

## Troubleshooting

### Port already in use

```bash
# Kill process on port 3002
lsof -ti:3002 | xargs kill -9
```

### Database connection error

```bash
# Check PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart postgres
```

### Permission denied

```bash
# Fix volume permissions
docker-compose exec astraeo chown -R node:node .
```

### Need clean rebuild

```bash
# Remove containers and volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Start fresh
docker-compose up -d
```

---

## Production Deployment

Docker image is **production-ready**:
- Multi-stage build (optimized size)
- Health checks configured
- Proper signal handling (dumb-init)
- Non-root user (node)
- All environment variables externalized

To deploy:

```bash
# Build production image
docker build -t astraeo:latest .

# Push to registry
docker tag astraeo:latest your-registry/astraeo:latest
docker push your-registry/astraeo:latest

# Deploy with environment variables
docker run -p 3002:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e ANTHROPIC_API_KEY="sk-..." \
  your-registry/astraeo:latest
```

---

## Health Checks

All services have health checks:
- App: GET `/api/health`
- PostgreSQL: `pg_isready`
- Redis: `PING`

View status:
```bash
docker-compose ps
```

---

## Architecture

```
┌─────────────────────────────────┐
│    Docker Compose Network       │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────────────────┐   │
│  │    Astraeo App (3002)    │   │
│  │  - Next.js frontend      │   │
│  │  - API routes            │   │
│  │  - Prisma ORM            │   │
│  └──────────────────────────┘   │
│            ↓                    │
│  ┌──────────────────────────┐   │
│  │  PostgreSQL (5432)       │   │
│  │  - Agents                │   │
│  │  - Missions              │   │
│  │  - Chat Sessions         │   │
│  │  - Settings              │   │
│  └──────────────────────────┘   │
│            ↓                    │
│  ┌──────────────────────────┐   │
│  │   Redis (6379)           │   │
│  │  - Cache                 │   │
│  │  - Sessions              │   │
│  └──────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

---

## Next Steps

1. ✅ Docker environment ready
2. Run migrations: `docker-compose exec astraeo npx prisma migrate dev`
3. Add API key to `.env.local`
4. Start developing!
