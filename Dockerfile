FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json ./

RUN npm ci

COPY . .

RUN npx tsc

FROM node:20-alpine AS runner

WORKDIR /app

# Solo instalar Python 3 (yt-dlp lo necesita)
RUN apk add --no-cache python3

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

CMD ["npm", "run", "start"]