# ── Build stage ──────────────────────────────────────────────────────────────
FROM docker.io/oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source and build (skips interactive version-bump prompt)
COPY . .
RUN bun run build:static

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM docker.io/nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
