FROM node:24.11-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json ./

RUN npm ci

COPY . .

RUN npx tsc


FROM node:24.11-alpine AS runner

WORKDIR /app

# Binarios necesarios en runtime
RUN apk add --no-cache \
    python3 \
    ffmpeg \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/assets ./dist/assets

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
