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
        ┌───────────────┬───────────┼───────────┬───────────────┐
        ▼               ▼           ▼           ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    AUTH     │ │   ENTITY    │ │  PORTFOLIO  │ │    ASSET    │ │    CORE     │
│   (8001)    │ │   (8003)    │ │   (8004)    │ │   (8005)    │ │   (8002)    │
│             │ │             │ │             │ │             │ │             │
│ • Login/MFA │ │ • LLCs/LPs  │ │ • Accounts  │ │ • Real Est. │ │ • Budgets   │
│ • JWT/RBAC  │ │ • Trusts    │ │ • Vehicles  │ │ • Tax Liens │ │ • Trans.    │
│ • Sessions  │ │ • Corps     │ │ • Holdings  │ │ • PE/Metals │ │ • AI/Reports│
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
        │               │               │               │               │
        └───────────────┴───────────────┼───────────────┴───────────────┘
                                        ▼
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
│   ├── gateway/           # API Gateway Service (8080)
│   │   ├── main.py        # Request routing, rate limiting, auth
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── auth/              # Auth & Identity Service (8001)
│   │   ├── main.py        # Login, MFA, JWT, RBAC
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── core/              # Core Domain Service (8002)
│   │   ├── main.py        # Budgets, Transactions, AI, Reports
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── entity/            # Entity Service (8003) - NEW!
│   │   ├── main.py        # LLCs, LPs, Trusts, Corporations
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── portfolio/         # Portfolio Service (8004) - NEW!
│   │   ├── main.py        # Accounts, Investment Vehicles, Holdings
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── assets/            # Asset Management Service (8005) - NEW!
│   │   ├── main.py        # Real Estate, Tax Liens, PE, Precious Metals
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
- `/api/transactions/*` - Transaction management
- `/api/budgets/*` - Budget management
- `/api/goals/*` - Financial goals
- `/api/ai/*` - AI Co-Pilot functions
- `/api/reports/*` - Report generation
- `/api/notifications/*` - Notification management
- And more...

### Entity Service (NEW in Phase 2)
| Endpoint | Description |
|----------|-------------|
| `GET /api/entities` | List all entities |
| `POST /api/entities` | Create new entity |
| `GET /api/entities/{id}` | Get entity details |
| `PUT /api/entities/{id}` | Update entity |
| `POST /api/entities/{id}/archive` | Archive entity |
| `POST /api/entities/{id}/restore` | Restore archived entity |
| `DELETE /api/entities/{id}` | Delete entity permanently |
| `GET /api/entities/default/current` | Get default entity |
| `POST /api/entities/default/set` | Set default entity |
| `GET /api/entities/summary` | Get entities summary |

### Portfolio Service (NEW in Phase 2)
| Endpoint | Description |
|----------|-------------|
| `GET /api/accounts` | List all accounts |
| `POST /api/accounts` | Create account |
| `GET /api/accounts/{id}` | Get account details |
| `PUT /api/accounts/{id}` | Update account |
| `DELETE /api/accounts/{id}` | Delete account |
| `GET /api/vehicles` | List investment vehicles |
| `POST /api/vehicles` | Create vehicle |
| `GET /api/vehicles/{id}` | Get vehicle details |
| `PUT /api/vehicles/{id}` | Update vehicle |
| `DELETE /api/vehicles/{id}` | Delete vehicle |
| `GET /api/holdings` | List holdings |
| `POST /api/holdings` | Create holding |
| `GET /api/holdings/{id}` | Get holding details |
| `PUT /api/holdings/{id}` | Update holding |
| `DELETE /api/holdings/{id}` | Delete holding |
| `GET /api/portfolio/summary` | Get portfolio summary |

### Asset Management Service (NEW in Phase 2)
| Endpoint | Description |
|----------|-------------|
| `GET /api/assets` | List general assets |
| `POST /api/assets` | Create asset |
| `GET /api/assets/{id}` | Get asset details |
| `PUT /api/assets/{id}` | Update asset |
| `DELETE /api/assets/{id}` | Delete asset |
| `GET /api/assets/summary` | Get all assets summary |
| `GET /api/real-estate` | List real estate properties |
| `POST /api/real-estate` | Create property |
| `GET /api/real-estate/{id}` | Get property details |
| `DELETE /api/real-estate/{id}` | Delete property |
| `GET /api/tax-liens` | List tax liens |
| `POST /api/tax-liens` | Create tax lien |
| `GET /api/tax-liens/{id}` | Get lien details |
| `DELETE /api/tax-liens/{id}` | Delete lien |
| `GET /api/private-equity` | List PE investments |
| `POST /api/private-equity` | Create PE investment |
| `GET /api/private-equity/{id}` | Get PE details |
| `DELETE /api/private-equity/{id}` | Delete PE investment |
| `GET /api/precious-metals` | List precious metals |
| `POST /api/precious-metals` | Create metal holding |
| `GET /api/precious-metals/{id}` | Get metal details |
| `DELETE /api/precious-metals/{id}` | Delete metal holding |

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

## 📝 Phase 2 Checklist (COMPLETE!)

- [x] Entity Service extraction
  - [x] Full CRUD for entities
  - [x] Entity types (LLC, LP, Personal, Trust, Corporation)
  - [x] Jurisdiction tracking
  - [x] Entity archiving (soft delete preserving history)
  - [x] Default entity per user
  - [x] Entity summary endpoint
- [x] Portfolio Service extraction
  - [x] Accounts (checking, savings, credit cards)
  - [x] Investment vehicles (401k, IRA, brokerage, crypto)
  - [x] Investment holdings with cost basis tracking
  - [x] Portfolio performance metrics
  - [x] Entity-scoped data access
- [x] Asset Management Service
  - [x] General assets with depreciation
  - [x] Real estate properties with rental income tracking
  - [x] Property tax liens with ROI calculation
  - [x] Private equity investments with MOIC
  - [x] Precious metals (gold, silver, platinum)
  - [x] Assets summary endpoint
- [x] Gateway routing updates for new services
- [x] Docker Compose updates

## 🔜 Next Phases

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
