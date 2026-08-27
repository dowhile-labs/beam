# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY packages/mcp/package.json ./packages/mcp/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/mcp ./packages/mcp
RUN pnpm --filter @dowhilelabs/beam-mcp build

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S beam && adduser -S beam -G beam

COPY --from=builder /app/packages/mcp/dist ./dist
COPY --from=builder /app/packages/mcp/package.json ./
COPY --from=builder /app/node_modules ./node_modules

USER beam
EXPOSE 3100
CMD ["node", "dist/server.js"]
