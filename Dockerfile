# syntax=docker/dockerfile:1
# Image: 825125930465.dkr.ecr.ap-south-2.amazonaws.com/linkedin-automation:latest

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json drizzle.config.ts ./
COPY drizzle ./drizzle
CMD ["npm", "run", "db:migrate"]

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Public URLs are inlined during `next build`. Secrets are mounted at build
# time (not ARG) so they do not persist in image history.
ARG NEXTAUTH_URL
ARG AUTH_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV AUTH_URL=$AUTH_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN --mount=type=secret,id=nextauth_secret,required=false \
    export NEXTAUTH_SECRET="$(cat /run/secrets/nextauth_secret 2>/dev/null || true)" && \
    npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
