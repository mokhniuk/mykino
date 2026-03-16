# ── Build stage ──────────────────────────────────────────────────────────────
FROM docker.io/oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies for both frontend and server
COPY package.json bun.lockb* ./
COPY server/package.json ./server/
RUN bun install --frozen-lockfile

# Copy source and build frontend
COPY . .
ARG IS_COMMUNITY=true
RUN VITE_IS_COMMUNITY_BUILD=$IS_COMMUNITY bun run build:static

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM docker.io/oven/bun:1-alpine

WORKDIR /app

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server code and its node_modules
COPY --from=builder /app/server ./server

# Runtime environment (internal port)
ENV PORT=9999
ENV NODE_ENV=production
EXPOSE 9999

# Start the unified Bun server
CMD ["bun", "run", "server/index.ts"]
