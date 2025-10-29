FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json ./

RUN npm ci

COPY . .

RUN npx tsc

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN rm -rf /var/cache/apk/*

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
