# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install

FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --target ES2022 --module CommonJS --moduleResolution node --skipLibCheck --esModuleInterop

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -r nodejs && useradd -r -m -g nodejs nestjs
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
# Prisma CLI for db push on boot (argon2 already in node_modules)
RUN npm install prisma@6.19.3 --no-save \
  && mkdir -p /app/uploads \
  && chown -R nestjs:nodejs /app
COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh && chown nestjs:nodejs /entrypoint.sh
USER nestjs
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
