# BlackieFi 3.0 - Product Requirements Document

## Original Problem Statement
Transform the existing application into the BlackieFi 3.0 microservices architecture using:
- Python (FastAPI) for backend services
- TypeScript (Node.js + React) for gateway app layer and frontend
- Nginx as the API gateway edge layer
- Docker + Docker Compose ONLY
- Ollama (local LLM runtime) for AI features

The system must boot fully locally with zero manual steps.

## Architecture Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx Gateway (8080)                     │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                   Gateway App - Node.js/TypeScript (8000)        │
└─────────────────────────────────────────────────────────────────┘
                                │
┌───────────┬───────────┬───────────┬───────────┬───────────┐
│   Auth    │   Core    │  Entity   │ Portfolio │  Assets   │
│   8001    │   8002    │   8003    │   8004    │   8005    │
└───────────┴───────────┴───────────┴───────────┴───────────┘
                                │
┌───────────────────────┬───────────────────────┬───────────────────────┐
│      MongoDB (27017)  │     Redis (6379)      │    ChromaDB (8000)    │
└───────────────────────┴───────────────────────┴───────────────────────┘
                                │
                      ┌───────────────┐
                      │ Ollama (11434)│
                      └───────────────┘
```

## User Personas
1. **Developer**: Needs simple DX with make up/down/logs/reset commands
2. **DevOps**: Needs production-grade Docker setup with healthchecks and persistence
3. **End User**: Needs asset management dashboard for entities, accounts, and assets

## Core Requirements (Static)
1. Single environment only (.env.template → .env auto-generation)
2. Zero external dependencies - all services run via Docker
3. Idempotent startup - make up works multiple times without issues
4. Simple DX with 4 main commands
5. Data persistence via Docker volumes mapped to /data/*

## What's Been Implemented (Jan 2026)

### Backend Services (FastAPI)
- [x] Auth Service (8001) - JWT authentication, login, register, logout, password change
- [x] Core Service (8002) - Legacy routes, AI chat with Ollama
- [x] Entity Service (8003) - CRUD for LLCs, trusts, corporations
- [x] Portfolio Service (8004) - CRUD for accounts, holdings
- [x] Assets Service (8005) - CRUD for real estate, precious metals, etc.
- [x] Shared Config Module - Centralized configuration for all services

### Gateway Layer
- [x] Gateway App (Node.js/TypeScript) - JWT validation, request routing, correlation IDs
- [x] Nginx Configuration - TLS termination, rate limiting, CORS, request logging

### Data Layer
- [x] MongoDB configuration with init script
- [x] Redis configuration for sessions/cache
- [x] ChromaDB for vector embeddings
- [x] Ollama with phi model for AI features

### Infrastructure
- [x] Docker Compose with all 12 services
- [x] Makefile with up/down/logs/reset commands
- [x] .env.template with all required variables
- [x] Data persistence directories

### Frontend
- [x] React application with auth flow
- [x] Dashboard with overview, entities, accounts, assets tabs
- [x] CRUD modals for creating entities, accounts, assets
- [x] Responsive design with dark theme

## Prioritized Backlog

### P0 (Critical - For Docker Testing)
- [ ] Test full Docker Compose startup
- [ ] Verify service health checks work correctly
- [ ] Test end-to-end user flow in containerized environment

### P1 (High Priority)
- [ ] Add MFA/TOTP authentication support
- [ ] Implement RAG-based document Q&A using ChromaDB
- [ ] Add real-time notifications via WebSocket

### P2 (Medium Priority)
- [ ] Add user roles and permissions
- [ ] Implement data export/import functionality
- [ ] Add audit logging for all operations
- [ ] Dashboard charts and analytics

### P3 (Nice to Have)
- [ ] Email notifications
- [ ] Integration with external financial APIs
- [ ] Mobile-responsive PWA features

## Next Tasks
1. User needs to run `make up` locally to test the full Docker setup
2. Test authentication flow end-to-end
3. Verify Ollama model pulling works correctly
4. Test data persistence across container restarts
