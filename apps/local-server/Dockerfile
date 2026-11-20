# Multi-stage Dockerfile for @oshxona/local-server
FROM node:20-alpine AS base
RUN npm install -g pnpm@10.5.2
WORKDIR /app

FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/local-server/ ./apps/local-server/
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
WORKDIR /app
RUN pnpm --filter @oshxona/shared run build
RUN pnpm --filter @oshxona/db prisma generate
RUN pnpm --filter @oshxona/printer run build
RUN pnpm --filter @oshxona/sync run build
RUN pnpm --filter @oshxona/local-server run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.5.2

COPY --from=build /app ./

EXPOSE 3000
CMD ["pnpm", "--filter", "@oshxona/local-server", "start"]
