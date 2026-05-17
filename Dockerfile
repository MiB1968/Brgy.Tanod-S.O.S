# ====================== Stage 1: Builder ======================
FROM node:20-slim AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build the app
RUN npm run build

# ====================== Stage 2: Production ======================
FROM node:20-slim AS production

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built assets
COPY --from=builder /app/dist ./dist
# If for some reason assets need public, we can also copy it
COPY --from=builder /app/public ./public                

# Security & runtime
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start command
CMD ["npm", "start"]
