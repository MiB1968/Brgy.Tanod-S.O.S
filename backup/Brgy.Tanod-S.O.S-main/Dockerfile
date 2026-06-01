# ====================== STAGE 1: Build ======================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy source
COPY . .

# Build the app
RUN npm run build

# ====================== STAGE 2: Production ======================
FROM nginx:alpine AS runner

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy configs
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/firebase-messaging-sw.js /usr/share/nginx/html/firebase-messaging-sw.js

# Security & performance
RUN apk add --no-cache curl \
    && chmod -R 755 /usr/share/nginx/html

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost || exit 1

CMD ["nginx", "-g", "daemon off;"]
