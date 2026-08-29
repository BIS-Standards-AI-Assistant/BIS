# BIS Standards Navigator — production image.
#
# Provider-independent by design (see docs/ARCHITECTURE.md): this single
# image works with either LLM path — OpenRouter or a local Ollama server —
# entirely via environment variables (LLM_PROVIDER, OPENROUTER_*,
# LOCAL_LLM_*). Nothing here is specific to one provider. See
# docker-compose.yml for the two ready-to-run setups.

# ---- deps: install once, cached across builds unless package*.json change ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: type-check + build the standalone Next.js output ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL isn't read at build time by this app (see src/db — lazy
# `getDb()` init), but Next.js still needs *a* value present for pages that
# reference env vars during the build's static-generation pass.
ENV DATABASE_URL="postgres://build:build@localhost:5432/build"
RUN npm run build

# ---- runner: minimal final image — only the standalone output + static assets ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
