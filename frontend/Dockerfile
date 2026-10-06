# ==========================================
# KubePulse Frontend Multi-Stage Production Dockerfile
# Stage 1: Build React static artifacts with Node 20 LTS
# Stage 2: Serve high-performance static files using Nginx Alpine
# ==========================================

# Stage 1: Compiler
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 2: High-Performance Production Web Server
FROM nginx:1.27-alpine AS production

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled static assets from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
