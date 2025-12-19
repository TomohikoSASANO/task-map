FROM node:20-alpine

WORKDIR /app

# Needed for native addons (argon2) on Alpine
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 8080
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]


