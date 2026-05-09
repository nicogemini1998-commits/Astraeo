# Build stage
FROM node:20-alpine AS builder

ARG NODE_ENV=development

WORKDIR /app

# Install OpenSSL 1.1.x for Prisma compatibility
RUN apk add --no-cache openssl-1.1 openssl openssl-dev

# Copy package files from astraeo directory
COPY astraeo/package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY astraeo/ ./

# Generate Prisma client with OpenSSL 1.1
RUN npx prisma generate

# Build Next.js
RUN NODE_ENV=production npm run build

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install dumb-init, OpenSSL 1.1, and PostgreSQL client for proper signal handling
RUN apk add --no-cache dumb-init postgresql-client openssl-1.1 openssl

# Copy package files
COPY astraeo/package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema for runtime
COPY astraeo/prisma ./prisma

# Copy built app from builder (for faster initial startup)
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Copy public files
COPY astraeo/public ./public

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start Next.js in development mode
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init and OpenSSL 1.1 for Prisma
RUN apk add --no-cache dumb-init openssl-1.1 openssl

COPY astraeo/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy Prisma schema
COPY astraeo/prisma ./prisma

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
