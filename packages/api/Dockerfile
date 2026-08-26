# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/api ./packages/api
RUN pnpm --filter @dowhilelabs/api build

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S beam && adduser -S beam -G beam

COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

USER beam
EXPOSE 3000
CMD ["node", "dist/server.js"]
