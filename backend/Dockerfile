# Stage 1: Build Node.js/TypeScript backend
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

# Prune dev dependencies to keep only production ones
RUN npm prune --omit=dev

# Stage 2: Production execution
FROM node:20-bookworm-slim

WORKDIR /app

# Copy only files needed for production dependencies installation
COPY package*.json ./

# Install only production dependencies
# We copy the node_modules from the build stage instead of running npm ci again
# This avoids having to recompile native modules like sqlite3
COPY --from=build /app/node_modules ./node_modules

# Copy compiled files from build stage
COPY --from=build /app/dist ./dist

# (Optional) Copy data folder if using local SQLite
# COPY data ./data

# Expose backend port
EXPOSE 3000

# Start application
CMD ["node", "dist/app.js"]
