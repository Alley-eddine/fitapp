# Multi-stage build for a pnpm-workspace Fastify service.
# Build context is the monorepo root: docker build -f services/ai/Dockerfile .
FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# --- build: install the whole workspace, build shared + this service --------
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fitapp/shared build \
 && pnpm --filter @fitapp/ai build
# Produce a self-contained deployment (real node_modules, no workspace symlinks).
RUN pnpm --filter @fitapp/ai deploy --prod --legacy /prod/ai

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /prod/ai /app
EXPOSE 3003
CMD ["node", "dist/index.js"]
