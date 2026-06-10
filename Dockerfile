# ============================================
# Smart Ride - Production Dockerfile
# Multi-stage build for minimal image size
# ============================================

# ---- Stage 1: deps ----
FROM node:20-alpine AS deps

# Install bun
RUN npm install -g bun

WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lock* package-lock.json* ./

# Install dependencies
RUN if [ -f bun.lock ]; then \
      bun install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# ---- Stage 2: builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy application source
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js application
RUN npm run build

# ---- Stage 3: runner ----
FROM node:20-alpine AS runner

LABEL maintainer="Smart Ride Team"
LABEL description="Smart Ride Super App - Production Image"
LABEL version="1.0.0"
LABEL org.opencontainers.image.title="Smart Ride"
LABEL org.opencontainers.image.description="Smart Ride Super App for Uganda"
LABEL org.opencontainers.image.version="1.0.0"

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
