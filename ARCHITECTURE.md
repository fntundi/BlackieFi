# BlackieFi 3.0 - Institutional-Grade Microservices Architecture

## 🏗️ Architecture Overview

BlackieFi 3.0 is built on a microservices architecture designed for institutional-grade security, scalability, and reliability.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY (8080)                              │
│  • TLS Termination    • Rate Limiting    • Auth Enforcement              │
│  • Request Routing    • Logging          • CORS Handling                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │ AUTH SERVICE │  │ CORE SERVICE │  │   FRONTEND   │
         │    (8001)    │  │    (8002)    │  │    (3000)    │
         │              │  │              │  │              │
         │ • Login/MFA  │  │ • Entities   │  │ • React SPA  │
         │ • JWT Tokens │  │ • Portfolios │  │ • Next.js    │
         │ • RBAC       │  │ • Assets     │  │              │
         │ • Sessions   │  │ • AI Co-Pilot│  │              │
         └──────────────┘  └──────────────┘  └──────────────┘
                    │               │
                    ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │   MongoDB   │  │    Redis    │  │  ChromaDB   │                      │
│  │   (27017)   │  │   (6379)    │  │   (8000)    │                      │
│  │             │  │             │  │             │                      │
│  │ • Entities  │  │ • Cache     │  │ • Vectors   │                      │
│  │ • Users     │  │ • Sessions  │  │ • Embeddings│                      │
│  │ • Assets    │  │ • Rate Lim  │  │ • RAG Data  │                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local service development)

### Development Setup

1. **Clone and configure environment:**
```bash
cp .env.microservices.example .env
# Edit .env with your configuration
```

2. **Start all services:**
```bash
docker-compose -f docker-compose.microservices.yml up -d
```

3. **Check service health:**
```bash
curl http://localhost:8080/health
```

4. **Access the application:**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8080
- API Docs: http://localhost:8080/docs

### Stopping Services
```bash
docker-compose -f docker-compose.microservices.yml down
```

### Viewing Logs
```bash
# All services
docker-compose -f docker-compose.microservices.yml logs -f

# Specific service
docker-compose -f docker-compose.microservices.yml logs -f gateway
```

## 📁 Project Structure

```
/app/
├── services/
│   ├── gateway/           # API Gateway Service
│   │   ├── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── auth/              # Auth & Identity Service
│   │   ├── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── core/              # Core Domain Service
│   │   ├── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── shared/            # Shared utilities
│       └── config.py
│
├── frontend/              # React Frontend
│   ├── src/
│   ├── Dockerfile.dev
│   └── package.json
│
├── backend/               # Legacy monolithic backend (being migrated)
│   └── routes/
│
├── infrastructure/        # Infrastructure configs
│   └── mongo-init.js
│
├── docker-compose.microservices.yml
├── .env.microservices.example
└── README.md
```

## 🔐 Security Features

### Authentication
- **JWT-based authentication** with access and refresh tokens
- **MFA support** (TOTP with QR code setup)
- **Session management** with Redis
- **Password reset** with secure tokens

### Authorization
- **RBAC foundation** (Admin, Analyst, Viewer roles planned)
- **Entity-scoped access** - all data is scoped to Entities
- **Gateway-enforced auth** - all requests validated at edge

### Data Security
- **Secrets management** - centralized, encrypted at rest
- **Rate limiting** - configurable per-IP limits
- **Request logging** - correlation IDs for tracing
- **Token blacklisting** - immediate logout capability

## 🔌 API Endpoints

### Gateway
| Endpoint | Description |
|----------|-------------|
| `GET /health` | Gateway health check |
| `GET /api/health` | Proxied health check |

### Auth Service
| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login (returns JWT) |
| `POST /api/auth/logout` | Logout (revokes tokens) |
| `POST /api/auth/refresh` | Refresh access token |
| `POST /api/auth/mfa/setup` | Setup MFA |
| `POST /api/auth/mfa/verify` | Verify MFA setup |
| `POST /api/auth/forgot-password` | Initiate password reset |
| `GET /api/auth/me` | Get current user profile |

### Core Service
All existing BlackieFi endpoints are available through the Core Service:
- `/api/entities/*` - Entity management
- `/api/accounts/*` - Account management
- `/api/transactions/*` - Transaction management
- `/api/budgets/*` - Budget management
- `/api/assets/*` - Asset management
- `/api/goals/*` - Financial goals
- `/api/ai/*` - AI Co-Pilot functions
- And more...

## 📊 Market Data Providers

| Provider | Data Types | Status |
|----------|------------|--------|
| **Alpha Vantage** | Stocks, Forex, Crypto, Commodities | ✅ Ready |
| **CoinGecko** | Crypto, Precious Metals | ✅ Ready |
| **Zillow/ATTOM** | Real Estate Valuations | 🔜 Planned |

## 🤖 AI Co-Pilot

The AI Co-Pilot supports multiple LLM providers:

| Provider | Models | Use Case |
|----------|--------|----------|
| **Emergent (Universal Key)** | GPT-4, Claude, Gemini | Default provider |
| **OpenRouter** | 300+ models | Alternative provider |

### Features
- **Knowledge Lab** - Upload documents, PDFs, URLs for RAG
- **Strategy Studio** - Define investment frameworks
- **Analysis Lab** - Run AI-powered asset analysis
- **Co-Pilot Briefing** - Daily financial insights

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment name | `development` |
| `JWT_SECRET` | JWT signing key | (required) |
| `MONGO_URL` | MongoDB connection | `mongodb://...` |
| `REDIS_URL` | Redis connection | `redis://...` |
| `EMERGENT_LLM_KEY` | Emergent API key | (optional) |
| `OPENROUTER_API_KEY` | OpenRouter key | (optional) |

## 📈 Scaling

The architecture supports horizontal scaling:

```yaml
# Scale gateway to 3 instances
docker-compose -f docker-compose.microservices.yml up -d --scale gateway=3
```

## 🧪 Testing

```bash
# Test gateway health
curl http://localhost:8080/health

# Test auth (register)
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"securepass123"}'

# Test protected endpoint
curl http://localhost:8080/api/entities \
  -H "Authorization: Bearer <your-token>"
```

## 📝 Phase 1 Checklist

- [x] Docker Compose setup
- [x] API Gateway with rate limiting
- [x] Auth Service with MFA
- [x] Core Service (routes migration)
- [x] Redis integration
- [x] ChromaDB integration
- [x] Secrets management pattern
- [ ] Full testing
- [ ] Documentation

## 🔜 Next Phases

### Phase 2: Entity-Centric Refactor
- Entity Service extraction
- Portfolio Service extraction
- Asset Management Service

### Phase 3: AI Co-Pilot
- Knowledge Lab implementation
- Strategy Studio
- Analysis Lab
- Vector embeddings pipeline

### Phase 4: Institutional Hardening
- Observability stack (Prometheus, Grafana)
- Audit logging
- Penetration testing
- DR & backup procedures

---

**Version:** 3.0.0-alpha  
**License:** Proprietary  
**Author:** BlackieFi Engineering Team
