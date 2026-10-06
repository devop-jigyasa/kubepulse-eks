# ==========================================
# KubePulse Backend Multi-Stage Production Dockerfile
# Base: Node.js 20 LTS Alpine (Security Hardened)
# ==========================================

# Stage 1: Dependency Builder
FROM node:20-alpine AS dependencies
WORKDIR /usr/src/app

COPY package*.json ./
# Clean production install with layer caching
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Final Minimal Runtime
FROM node:20-alpine AS runtime
WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=8080

# Copy dependencies from builder stage
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY . .

# Security Best Practice: Run container as unprivileged non-root user
USER node

EXPOSE 8080

# Built-in container health check for container runtimes
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

CMD ["node", "index.js"]
