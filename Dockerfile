# syntax=docker/dockerfile:1.7
# Multi-stage production build for Next.js (App Router, standalone output).
# Used by CI/CD and demo deploy. For local development use Dockerfile.dev.

# ---------------------------------------------------------------------------
# Stage 1 — install dependencies (cached layer)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Required by some native deps (Prisma engines, sharp, etc.)
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund && npx prisma generate

# ---------------------------------------------------------------------------
# Stage 2 — build the Next.js app
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — minimal runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache openssl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone output for minimal image size (Next.js standalone mode).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER nextjs
EXPOSE 3000

# Run migrations before starting the server. For prod this should be a
# one-shot job, but for the MVP demo it's fine to run inline.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
