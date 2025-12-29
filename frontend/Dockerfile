# ============================================================================
# EHS Management System - Frontend Dockerfile
# ============================================================================
# Multi-stage build for production optimization
#

# ============================================================================
# Stage 1: Base Node Environment
# ============================================================================
FROM node:20-alpine as base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git

# ============================================================================
# Stage 2: Dependencies Installation
# ============================================================================
FROM base as dependencies

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# ============================================================================
# Stage 3: Development Dependencies
# ============================================================================
FROM base as dev-dependencies

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci --legacy-peer-deps && npm cache clean --force

# ============================================================================
# Stage 4: Build Stage
# ============================================================================
FROM dev-dependencies as build

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============================================================================
# Stage 5: Production Image
# ============================================================================
FROM nginx:alpine as production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ============================================================================
# Stage 6: Development Image
# ============================================================================
FROM dev-dependencies as development

# Copy source code
COPY . .

# Expose port for development
EXPOSE 5173

# Development command
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
