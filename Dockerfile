# This file will build the docker image for the frontend.
# The backend is currently deployed via the serverless framework.

# Copied and adapted from https://github.com/vercel/next.js/blob/canary/examples/with-docker-multi-env/docker/production/Dockerfile
# Steps 1 and 2 were merged to make the mono repo work.

FROM public.ecr.aws/docker/library/node:20.9.0-slim AS base

FROM base AS builder

# Setting this should instruct yarn to only install non-dev dependencies. (does not seem to work)
ENV NODE_ENV=production

WORKDIR /app

COPY packages/janus-trainer-frontend ./packages/janus-trainer-frontend
COPY packages/janus-trainer-dto ./packages/janus-trainer-dto

RUN corepack enable
RUN yarn set version stable
COPY package.json yarn.lock .yarnrc.yml ./
# This should be --immutable, but that fails. So we'll just do a complete install.
RUN yarn install

RUN yarn workspace janus-trainer-dto build
RUN yarn workspace janus-trainer-frontend build

# 3. Production image, copy all the files and run next
FROM base AS runner

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.1 /lambda-adapter /opt/extensions/lambda-adapter

WORKDIR /app

ENV NODE_ENV=production
ENV AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

# the monorepo setup results in a complicated file structure for the standalone output.
# partially inspired from https://github.com/vercel/next.js/discussions/35437
COPY --from=builder --chown=nextjs:nodejs /app/packages/janus-trainer-frontend/.next/standalone/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/packages/janus-trainer-frontend/.next/standalone/packages/janus-trainer-frontend ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/janus-trainer-frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/packages/janus-trainer-frontend/.next/static ./.next/static

EXPOSE 8080

CMD ["node", "server.js"]


