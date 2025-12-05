# File from https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
# Changes are marked with TLT

# TLT - changed node version to 22
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
# TLT - added .yarnrc.yml
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* .yarnrc.yml ./
# TLT: added corepack yarn install and changed --frozen-lockfile to --immutable
RUN corepack enable && corepack install

RUN yarn --immutable


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

# TLT: 'prisma generate' will generate files into ./generated

# TLT - added corepack and prisma commands. Removed non-yarn commands
RUN corepack enable && corepack install

# TLT: 'prisma generate' will generate files into node_modules
COPY prisma ./prisma
RUN yarn prisma generate
RUN yarn build

# Production image, copy all the files and run next
FROM base AS runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN corepack enable

WORKDIR /app
RUN chown -R nextjs:nodejs /app

USER nextjs

ENV NODE_ENV=production

# TLT: The prisma directory contains the migrations. prisma.config.ts contains the configuration of the db source
# TLT: Since we execute them on the VM via the docker images, the files need to be there
COPY --chown=nextjs:nodejs  .yarnrc.yml yarn.lock package.json ./
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs prisma.config.ts ./


COPY --from=builder  --chown=nextjs:nodejs /app/public ./public
COPY --from=builder  --chown=nextjs:nodejs /app/generated ./generated

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static


EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]