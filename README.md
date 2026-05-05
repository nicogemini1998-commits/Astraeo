# Misión Control v2

Dashboard inteligente para gestión de proyectos y agentes Claude.

## Características

- Dashboard en tiempo real con métricas y KPIs
- Chat integrado con Claude
- Kanban para gestión de misiones
- Editor de agentes y habilidades
- Pixel Stage con agentes animados
- Commander: Sistema builder con tool use
- Settings contextualizados por empresa

## Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **State:** Zustand
- **Charts:** Recharts
- **API:** Claude API (Anthropic)

## Setup

```bash
cd astraeo
npm install
npm run dev
```

Accede a `http://localhost:3000`

## Variables de Entorno

Cuando tengas API key:

```env
ANTHROPIC_API_KEY=sk-...
```

Añade a `.env.local` (nunca en git)

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
- ✅ Sem API key en código
- ✅ Variables de entorno aisladas

## Desarrollo

```bash
npm run dev      # Dev server
npm run build    # Build prod
npm run lint     # ESLint
npm run format   # Prettier
```
