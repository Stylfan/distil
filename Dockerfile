# Production image for Distil. Multi-stage:
#   deps     -> install node_modules once
#   build    -> next build (standalone output)
#   migrator -> runs scripts/migrate.mjs with production dependencies only
#   runner   -> non-root runtime serving the standalone build

FROM node:26-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
# Node 25 and later ship without Corepack; pnpm is pinned to packageManager.
RUN npm install -g pnpm@10.28.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The example workshop for demo visits is optional; without it a visit starts empty.
RUN mkdir -p demo-workshop && pnpm build

# The migration script is plain JavaScript on drizzle-orm and pg, both
# production dependencies, so this image carries no build tooling.
FROM base AS migrator
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/
USER node
CMD ["node", "scripts/migrate.mjs"]

FROM base AS runner
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/demo-workshop ./demo-workshop
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
