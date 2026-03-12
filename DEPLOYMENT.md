# BlackieFi 3.0 - Microservices Deployment Guide

## Overview

BlackieFi 3.0 uses a microservices architecture with the following services:

| Service | Port | Description |
|---------|------|-------------|
| **Gateway** | 8080 | API Gateway - routing, rate limiting, auth |
| **Auth** | 8001 | Authentication, MFA, JWT tokens |
| **Core** | 8002 | Budgets, Transactions, AI, Reports |
| **Entity** | 8003 | LLCs, LPs, Trusts, Corporations |
| **Portfolio** | 8004 | Accounts, Investment Vehicles, Holdings |
| **Asset** | 8005 | Real Estate, Tax Liens, PE, Precious Metals |
| **MongoDB** | 27017 | Primary database |
| **Redis** | 6379 | Caching, sessions, rate limiting |
| **ChromaDB** | 8000 | Vector store for AI/RAG |

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM recommended
- Ports 8080, 27017, 6379, 8000 available

## Quick Start

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.microservices.example .env.microservices

# Edit with your values (especially secrets!)
nano .env.microservices
```

### 2. Deploy Services

```bash
# Make deploy script executable
chmod +x deploy.sh

# Start all services
./deploy.sh up

# Check status
./deploy.sh status
```

### 3. Verify Deployment

```bash
# Test gateway health
curl http://localhost:8080/health

# Test auth service
curl http://localhost:8080/api/v1/auth/health

# Test entity service
curl http://localhost:8080/api/v1/entities/health
```

## Deployment Script Commands

```bash
./deploy.sh up              # Start all services
./deploy.sh down            # Stop all services
./deploy.sh restart         # Restart all services
./deploy.sh status          # Show service status
./deploy.sh logs            # Show all logs
./deploy.sh logs gateway    # Show specific service logs
./deploy.sh cleanup         # Remove all containers/volumes
```

## Production Deployment

### 1. Update Secrets

**CRITICAL:** Change all default secrets in `.env.microservices.production`:

```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 24  # For passwords
```

### 2. Configure External Services

```env
# AI/LLM (required for AI features)
EMERGENT_LLM_KEY=your_key_here

# Email (required for notifications)
RESEND_API_KEY=your_key_here

# Market Data (optional)
ALPHA_VANTAGE_API_KEY=your_key_here
```

### 3. Deploy for Production

```bash
./deploy.sh up production
```

### 4. Set Up Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name api.blackiefi.com;
    
    ssl_certificate /etc/ssl/certs/blackiefi.crt;
    ssl_certificate_key /etc/ssl/private/blackiefi.key;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Architecture

```
                    ┌─────────────────────┐
                    │     INTERNET        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   API GATEWAY       │
                    │     (8080)          │
                    │  • Rate Limiting    │
                    │  • Auth Check       │
                    │  • Routing          │
                    └──────────┬──────────┘
                               │
        ┌──────────┬──────────┼──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │  AUTH  │ │ ENTITY │ │PORTFLIO│ │ ASSET  │ │  CORE  │
   │ (8001) │ │ (8003) │ │ (8004) │ │ (8005) │ │ (8002) │
   └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
        │          │          │          │          │
        └──────────┴──────────┼──────────┴──────────┘
                              ▼
              ┌───────────────────────────────┐
              │         DATA LAYER            │
              │  MongoDB │ Redis │ ChromaDB   │
              └───────────────────────────────┘
```

## API Routing

All requests go through the Gateway at port 8080:

| Route Pattern | Target Service |
|--------------|----------------|
| `/api/v1/auth/*` | Auth Service |
| `/api/v1/entities/*` | Entity Service |
| `/api/v1/accounts/*` | Portfolio Service |
| `/api/v1/vehicles/*` | Portfolio Service |
| `/api/v1/holdings/*` | Portfolio Service |
| `/api/v1/assets/*` | Asset Service |
| `/api/v1/real-estate/*` | Asset Service |
| `/api/v1/tax-liens/*` | Asset Service |
| `/api/v1/private-equity/*` | Asset Service |
| `/api/v1/precious-metals/*` | Asset Service |
| `/api/v1/*` | Core Service (default) |

## Monitoring

### Health Checks

Each service exposes a `/health` endpoint:

```bash
# Check all services
for port in 8001 8002 8003 8004 8005; do
    echo "Service on $port: $(curl -s http://localhost:$port/health | jq -r .status)"
done
```

### Logs

```bash
# All services
docker-compose -f docker-compose.microservices.yml logs -f

# Specific service
docker-compose -f docker-compose.microservices.yml logs -f gateway
```

## Troubleshooting

### Service Won't Start

1. Check logs: `./deploy.sh logs <service-name>`
2. Verify environment variables are set
3. Check port availability: `netstat -tulpn | grep <port>`

### Database Connection Issues

1. Check MongoDB is running: `docker ps | grep mongodb`
2. Verify connection string in service logs
3. Test connection: `mongosh mongodb://localhost:27017`

### Gateway Returns 502

1. Check target service is healthy
2. Verify service discovery (container names)
3. Check internal network connectivity

## Scaling

For horizontal scaling, update `docker-compose.microservices.yml`:

```yaml
entity-service:
  ...
  deploy:
    replicas: 3
```

Then use a load balancer or Docker Swarm/Kubernetes.

## Backup & Recovery

### MongoDB Backup

```bash
# Backup
docker exec blackiefi-mongodb mongodump --out /backup
docker cp blackiefi-mongodb:/backup ./backup

# Restore
docker cp ./backup blackiefi-mongodb:/backup
docker exec blackiefi-mongodb mongorestore /backup
```

### Redis Backup

Redis persistence is enabled by default. Data is stored in the `redis_data` volume.

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated unique JWT_SECRET
- [ ] Enabled HTTPS via reverse proxy
- [ ] Configured firewall rules
- [ ] Set up log monitoring
- [ ] Enabled database authentication
- [ ] Restricted CORS_ORIGINS for production
