# Stage 1: Build + compile
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Install build dependencies for native modules (sqlite3 on ARM)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install all deps, compile TS, then prune to production-only
RUN npm ci
COPY . .
RUN npm run build \
 && npm prune --omit=dev

# Stage 2: Final lean image (no build tools)
FROM node:20-bookworm-slim

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/app.js"]
