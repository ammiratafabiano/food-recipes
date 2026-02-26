# Stage 1: Build TypeScript code
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Install build dependencies for native modules (like sqlite3 on ARM)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript)
RUN npm ci

# Copy source code
COPY . .

# Compile TypeScript code
RUN npm run build

# Stage 2: Install production dependencies (compiled for target architecture)
FROM node:20-bookworm-slim AS production-deps

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install only production dependencies – native modules are compiled fresh here
RUN npm ci --omit=dev

# Stage 3: Final production image
FROM node:20-bookworm-slim

WORKDIR /app

# Copy production dependencies (compiled for the correct architecture)
COPY --from=production-deps /app/node_modules ./node_modules

# Copy compiled JS from build stage
COPY --from=build /app/dist ./dist

# Expose backend port
EXPOSE 3000

# Start application
CMD ["node", "dist/app.js"]
