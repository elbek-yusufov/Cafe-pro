# Multi-stage Dockerfile for @oshxona/admin-web (Next.js 15)
FROM node:20-alpine AS base
RUN npm install -g pnpm@10.5.2
WORKDIR /app

FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/admin-web/ ./apps/admin-web/
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
WORKDIR /app
RUN pnpm --filter @oshxona/shared run build
RUN pnpm --filter @oshxona/admin-web run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.5.2

COPY --from=build /app ./

EXPOSE 3001
CMD ["pnpm", "--filter", "@oshxona/admin-web", "start"]
