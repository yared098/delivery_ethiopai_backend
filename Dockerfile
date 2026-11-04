FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM base AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

RUN mkdir -p uploads/couriers uploads/providers \
    && chown -R node:node /app/uploads

USER node

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
