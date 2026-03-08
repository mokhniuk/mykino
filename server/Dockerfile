FROM docker.io/oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3001

CMD ["bun", "run", "index.ts"]
