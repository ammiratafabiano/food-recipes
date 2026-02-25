# Stage 1: Build Node.js/TypeScript backend
FROM node:20-alpine AS build

WORKDIR /app

# Install build dependencies for native modules (like sqlite3 on ARM)
RUN apk add --no-cache python3 make g++

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript)
RUN npm ci

# Copy source code
COPY . .

# Compile TypeScript code
RUN npm run build

# Stage 2: Production execution
FROM node:20-alpine

WORKDIR /app

# Copy only files needed for production dependencies installation
COPY package*.json ./

# Install only production dependencies
RUN apk add --no-cache python3 make g++ && \
    npm ci --omit=dev && \
    apk del python3 make g++

# Copy compiled files from build stage
COPY --from=build /app/dist ./dist

# (Optional) Copy data folder if using local SQLite
# COPY data ./data

# Expose backend port
EXPOSE 3000

# Start application
CMD ["node", "dist/app.js"]
