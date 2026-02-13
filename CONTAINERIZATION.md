# Containerization Guide: Base44 Financial Application

## Executive Summary

This document provides a comprehensive guide for containerizing the Base44 Financial Application ("BlackieFi") as a single, self-contained Docker image deployable on any container-compatible platform.

---

## Application Architecture Analysis

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend | React + Vite | React 18.2, Vite 6.1 |
| UI Framework | Tailwind CSS + shadcn/ui | Tailwind 3.4 |
| State Management | TanStack Query | 5.84 |
| Build Tooling | Vite + PostCSS | ESM modules |
| Backend Functions | Deno (TypeScript) | External (Base44 Platform) |
| External SDK | @base44/sdk | 0.8.18 |

### Application Type

This is a **frontend-only SPA** (Single Page Application) that:
- Connects to an external Base44 backend via SDK
- Uses serverless functions hosted on Base44's platform (`/functions/*.ts`)
- Requires runtime environment variables for configuration

### Key Dependencies

```
@base44/sdk           - Core SDK for backend communication
@base44/vite-plugin   - Build-time plugin for Base44 integration
@tanstack/react-query - Server state management
react-router-dom      - Client-side routing
```

---

## Containerization Strategy

### Recommended Approach: Multi-Stage Build with Nginx

Since this is a static SPA, the optimal strategy is:

1. **Build Stage**: Node.js environment to compile the React app
2. **Runtime Stage**: Lightweight Nginx server to serve static files

### Why This Approach?

| Factor | Benefit |
|--------|---------|
| Image Size | ~25-40MB vs ~1GB+ with Node runtime |
| Security | No Node.js runtime vulnerabilities |
| Performance | Nginx optimized for static content |
| Simplicity | No process management needed |

---

## Dockerfile

```dockerfile
# =============================================================================
# Stage 1: Build Environment
# =============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (layer caching optimization)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build arguments for environment variables
# These are injected at BUILD TIME
ARG VITE_BASE44_APP_ID
ARG VITE_BASE44_APP_BASE_URL
ARG VITE_BASE44_FUNCTIONS_VERSION

# Set environment variables for build
ENV VITE_BASE44_APP_ID=$VITE_BASE44_APP_ID
ENV VITE_BASE44_APP_BASE_URL=$VITE_BASE44_APP_BASE_URL
ENV VITE_BASE44_FUNCTIONS_VERSION=$VITE_BASE44_FUNCTIONS_VERSION

# Build the application
RUN npm run build

# =============================================================================
# Stage 2: Production Runtime
# =============================================================================
FROM nginx:alpine AS production

# Install envsubst for runtime environment variable substitution
RUN apk add --no-cache gettext

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy entrypoint script for runtime env injection
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Run as non-root user
USER appuser

# Start nginx via entrypoint (handles runtime env injection)
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

---

## Supporting Configuration Files

### nginx.conf

```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript 
               application/xml application/xml+rss text/javascript application/x-javascript
               image/svg+xml;

    server {
        listen 8080;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # SPA routing - serve index.html for all routes
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### docker-entrypoint.sh

```bash
#!/bin/sh
set -e

# Runtime Environment Variable Injection
# ======================================
# This script injects environment variables into the built JS files at runtime.
# This allows the same image to be deployed to different environments.

# Directory containing built files
HTML_DIR="/usr/share/nginx/html"

# If runtime env vars are set, inject them into the app
if [ -n "$RUNTIME_BASE44_APP_ID" ] || [ -n "$RUNTIME_BASE44_APP_BASE_URL" ]; then
    echo "Injecting runtime environment variables..."
    
    # Create a config.js file that will be loaded before the app
    cat > "$HTML_DIR/config.js" << EOF
window.__RUNTIME_CONFIG__ = {
    VITE_BASE44_APP_ID: "${RUNTIME_BASE44_APP_ID:-}",
    VITE_BASE44_APP_BASE_URL: "${RUNTIME_BASE44_APP_BASE_URL:-}",
    VITE_BASE44_FUNCTIONS_VERSION: "${RUNTIME_BASE44_FUNCTIONS_VERSION:-}"
};
EOF

    # Inject config.js script tag into index.html (before other scripts)
    sed -i 's|<head>|<head><script src="/config.js"></script>|' "$HTML_DIR/index.html"
fi

echo "Starting Nginx..."
exec "$@"
```

---

## Environment Variables

### Build-Time Variables (Baked into Image)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_BASE44_APP_ID` | Base44 application identifier | Yes |
| `VITE_BASE44_APP_BASE_URL` | Base44 backend URL | Yes |
| `VITE_BASE44_FUNCTIONS_VERSION` | Functions version | No |

### Runtime Variables (Override at Container Start)

| Variable | Description | Required |
|----------|-------------|----------|
| `RUNTIME_BASE44_APP_ID` | Override app ID at runtime | No |
| `RUNTIME_BASE44_APP_BASE_URL` | Override backend URL at runtime | No |
| `RUNTIME_BASE44_FUNCTIONS_VERSION` | Override functions version | No |

---

## Build Commands

### Option 1: Build with Build Arguments (Recommended for CI/CD)

```bash
# Build the image with environment variables baked in
docker build \
    --build-arg VITE_BASE44_APP_ID=your_app_id \
    --build-arg VITE_BASE44_APP_BASE_URL=https://your-app.base44.app \
    -t blackiefi:latest .
```

### Option 2: Build Generic Image (Configure at Runtime)

```bash
# Build without baked-in config
docker build -t blackiefi:latest .

# Run with runtime environment variables
docker run -d \
    -p 8080:8080 \
    -e RUNTIME_BASE44_APP_ID=your_app_id \
    -e RUNTIME_BASE44_APP_BASE_URL=https://your-app.base44.app \
    blackiefi:latest
```

---

## Docker Compose Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  blackiefi:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_BASE44_APP_ID: ${VITE_BASE44_APP_ID}
        VITE_BASE44_APP_BASE_URL: ${VITE_BASE44_APP_BASE_URL}
    image: blackiefi:${TAG:-latest}
    container_name: blackiefi
    ports:
      - "8080:8080"
    environment:
      # Runtime overrides (optional)
      - RUNTIME_BASE44_APP_ID=${RUNTIME_BASE44_APP_ID:-}
      - RUNTIME_BASE44_APP_BASE_URL=${RUNTIME_BASE44_APP_BASE_URL:-}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 128M
        reservations:
          cpus: '0.1'
          memory: 32M
```

### .env (for Docker Compose)

```env
# Build-time configuration
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-app.base44.app

# Runtime overrides (optional)
RUNTIME_BASE44_APP_ID=
RUNTIME_BASE44_APP_BASE_URL=

# Image tag
TAG=latest
```

---

## Deployment Scenarios

### 1. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blackiefi
  labels:
    app: blackiefi
spec:
  replicas: 2
  selector:
    matchLabels:
      app: blackiefi
  template:
    metadata:
      labels:
        app: blackiefi
    spec:
      containers:
        - name: blackiefi
          image: your-registry/blackiefi:latest
          ports:
            - containerPort: 8080
          env:
            - name: RUNTIME_BASE44_APP_ID
              valueFrom:
                configMapKeyRef:
                  name: blackiefi-config
                  key: app-id
            - name: RUNTIME_BASE44_APP_BASE_URL
              valueFrom:
                configMapKeyRef:
                  name: blackiefi-config
                  key: base-url
          resources:
            limits:
              cpu: "500m"
              memory: "128Mi"
            requests:
              cpu: "100m"
              memory: "64Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: blackiefi
spec:
  selector:
    app: blackiefi
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

### 2. AWS ECS Task Definition

```json
{
  "family": "blackiefi",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "blackiefi",
      "image": "your-ecr-repo/blackiefi:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "RUNTIME_BASE44_APP_ID",
          "value": "your_app_id"
        },
        {
          "name": "RUNTIME_BASE44_APP_BASE_URL",
          "value": "https://your-app.base44.app"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/blackiefi",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 3. Google Cloud Run

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/blackiefi

# Deploy to Cloud Run
gcloud run deploy blackiefi \
    --image gcr.io/PROJECT_ID/blackiefi \
    --platform managed \
    --port 8080 \
    --allow-unauthenticated \
    --set-env-vars="RUNTIME_BASE44_APP_ID=your_app_id,RUNTIME_BASE44_APP_BASE_URL=https://your-app.base44.app"
```

### 4. Azure Container Instances

```bash
az container create \
    --resource-group myResourceGroup \
    --name blackiefi \
    --image your-registry/blackiefi:latest \
    --dns-name-label blackiefi \
    --ports 8080 \
    --environment-variables \
        RUNTIME_BASE44_APP_ID=your_app_id \
        RUNTIME_BASE44_APP_BASE_URL=https://your-app.base44.app
```

---

## Considerations & Caveats

### 1. Serverless Functions

The `/functions/*.ts` files use **Deno runtime** and are designed to run on Base44's serverless platform. These are **NOT containerized** with this image because:

- They use `Deno.serve()` API specific to Base44's edge runtime
- They depend on `createClientFromRequest()` from Base44 SDK
- They're invoked via `base44.functions.invoke()` from the frontend

**Impact**: The containerized frontend will still call these functions via the Base44 SDK. No changes needed.

### 2. Authentication Flow

The app uses Base44's authentication system:
- `base44.auth.me()` - Get current user
- `base44.auth.logout()` - Logout user
- Token passed via URL parameters

**Impact**: Auth tokens must be passed correctly. The containerized app works identically to the non-containerized version.

### 3. SDK Configuration

The `@base44/vite-plugin` configures the SDK at build time. Key settings:

```javascript
base44({
  legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
  hmrNotifier: true,
  navigationNotifier: true,
  visualEditAgent: true
})
```

**Impact**: The `hmrNotifier` and `visualEditAgent` are development features. Consider disabling for production builds by adding:

```dockerfile
ENV NODE_ENV=production
```

### 4. Image Size Estimation

| Stage | Estimated Size |
|-------|----------------|
| Builder (temporary) | ~1.2GB |
| Final Nginx image | ~25-40MB |

---

## CI/CD Pipeline Example (GitHub Actions)

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=sha

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          build-args: |
            VITE_BASE44_APP_ID=${{ secrets.VITE_BASE44_APP_ID }}
            VITE_BASE44_APP_BASE_URL=${{ secrets.VITE_BASE44_APP_BASE_URL }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Quick Start Checklist

- [ ] Copy `Dockerfile` to repository root
- [ ] Create `nginx.conf` in repository root
- [ ] Create `docker-entrypoint.sh` in repository root (make executable)
- [ ] Create `.env` file with Base44 credentials
- [ ] Add `.dockerignore` file (see below)
- [ ] Build image: `docker build -t blackiefi .`
- [ ] Test locally: `docker run -p 8080:8080 blackiefi`
- [ ] Push to registry for deployment

### .dockerignore

```
node_modules
dist
.git
.gitignore
*.md
!README.md
.env.local
.env.*.local
.vscode
.idea
*.log
coverage
.nyc_output
```

---

## Summary

| Aspect | Recommendation |
|--------|----------------|
| Base Image | `node:20-alpine` (build) → `nginx:alpine` (runtime) |
| Build Strategy | Multi-stage build |
| Final Image Size | ~25-40MB |
| Port | 8080 (configurable) |
| Health Check | `/health` endpoint |
| Security | Non-root user, security headers |
| Platform Support | Any Docker/OCI-compatible platform |

This containerization approach produces a lightweight, secure, and portable image that can be deployed consistently across any container orchestration platform.
