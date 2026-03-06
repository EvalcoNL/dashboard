# ═══════════════════════════════════════════════════════════════════
# Multi-stage Dockerfile for Evalco Dashboard
# Stage 1: Install dependencies
# Stage 2: Build the application
# Stage 3: Production image (minimal)
# ═══════════════════════════════════════════════════════════════════

# ─── Stage 1: Dependencies ───
FROM node:20-alpine AS deps
WORKDIR /app

# Install glibc compatibility for Prisma
RUN apk add --no-cache gcompat || apk add --no-cache libc6-compat || true

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# ─── Stage 2: Build ───
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Next.js standalone output for minimal Docker image
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── Stage 3: Production ───
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma client (needed at runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/@libsql ./node_modules/@libsql
COPY --from=builder /app/node_modules/libsql ./node_modules/libsql
COPY --from=builder /app/prisma ./prisma

# Copy Prisma CLI (needed for migrations via prisma db push)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy ClickHouse init scripts (for reference)
COPY --from=builder /app/scripts ./scripts

# Create writable data directory for SQLite (before switching to non-root user)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
