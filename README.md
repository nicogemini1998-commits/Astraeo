# Astraeo - Misión Control v2

Dashboard inteligente para gestión de proyectos y agentes Claude.

## Características

- Dashboard en tiempo real con métricas y KPIs
- Chat integrado con Claude
- Kanban para gestión de misiones
- Editor de agentes y habilidades
- Pixel Stage con agentes animados
- Commander: Sistema builder con tool use
- Settings contextualizados por empresa
- Backend con PostgreSQL + Redis
- API routes con Next.js

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **State:** Zustand
- **Charts:** Recharts
- **Database:** PostgreSQL
- **Cache:** Redis
- **ORM:** Prisma
- **API:** Claude API (Anthropic)

## 🐳 Docker Development (Recomendado)

**Entorno completo con un comando:**

```bash
# Copiar variables de entorno
cp .env.docker astraeo/.env.local

# Iniciar servicios (PostgreSQL, Redis, Next.js)
docker-compose up -d

# Ejecutar migraciones de BD
docker-compose exec astraeo npx prisma migrate dev

# Ver logs
docker-compose logs -f astraeo
```

**App disponible en:** `http://localhost:3002`

Ver [DOCKER.md](./DOCKER.md) para documentación completa.

## Setup Local (sin Docker)

```bash
cd astraeo
npm install
cp .env.example .env.local

# Configurar PostgreSQL y Redis manualmente
npm run db:migrate
npm run dev
```

Accede a `http://localhost:3000`

## Variables de Entorno

**Desarrollo (Docker):**
```bash
cp .env.docker astraeo/.env.local
```

**Añadir Claude API key:**
```env
ANTHROPIC_API_KEY=sk-...
```

## Estructura

```
astraeo/
├── app/                 # Pages y layouts
├── components/          # React components
├── lib/                 # Utilities y helpers
├── store/              # Zustand store
├── types/              # TypeScript types
└── styles/             # Global CSS
```

## Seguridad

- ✅ `.gitignore` protege credenciales
- ✅ Sin API key en código
- ✅ Variables de entorno aisladas

## Desarrollo

```bash
npm run dev      # Dev server
npm run build    # Build prod
npm run lint     # ESLint
npm run format   # Prettier
```
