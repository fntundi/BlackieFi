# PRD: BlackieFi - Self-Hosted Financial Tracker

## Original Problem Statement
1. Review the Base44 Financial Application repository and provide guidance on containerizing the entire application as a single, self-contained Docker image deployable on any container-compatible platform.
2. Explore using base44-to-supabase-sdk to migrate from Base44 platform to self-hosted Supabase.
3. Implement the SDK replacement and database schema, containerize for local development.

## Application Overview
- **Name**: BlackieFi (Base44 Financial Tracker)
- **Type**: Full-stack SPA with Supabase backend
- **Original Stack**: React 18.2, Vite 6.1, Base44 SDK
- **New Stack**: React 18.2, Vite 6.1, Supabase (PostgreSQL)

## Core Requirements
1. ✅ Single self-contained Docker image
2. ✅ Platform-agnostic deployment capability
3. ✅ Drop-in SDK replacement (zero code changes)
4. ✅ Complete database schema for all entities
5. ✅ Local development environment with Docker

## What's Been Implemented (Jan 2026)

### SDK Replacement
- [x] `src/lib/supabase-client.js` - Supabase connection
- [x] `src/lib/custom-sdk.js` - Universal SDK with Base44 API compatibility
- [x] `src/api/base44Client.js` - Drop-in replacement exports

### Database Schema
- [x] `supabase/migrations/001_initial_schema.sql` - 11 tables with indexes
- [x] `supabase/migrations/002_rls_policies.sql` - Row Level Security
- [x] `supabase/migrations/003_seed_data.sql` - Sample categories

### Docker Configuration
- [x] `Dockerfile` - Multi-stage production build (~25-40MB)
- [x] `Dockerfile.dev` - Development with hot reload
- [x] `docker-compose.yml` - Full self-hosted Supabase stack
- [x] `docker-compose.simple.yml` - Simplified (Supabase Cloud)
- [x] `docker/kong.yml` - API Gateway configuration
- [x] `nginx.conf` - Production web server
- [x] `docker-entrypoint.sh` - Runtime env injection

### Documentation
- [x] `README.md` - Complete setup guide
- [x] `CONTAINERIZATION.md` - Original containerization guide
- [x] `MIGRATION_ANALYSIS.md` - Base44 to Supabase analysis
- [x] `.env.example` - Environment template

## Database Tables
| Table | Description |
|-------|-------------|
| `users` | User profiles |
| `entities` | Financial accounts |
| `categories` | Transaction categories |
| `transactions` | Financial transactions |
| `recurring_transactions` | Recurring payments |
| `budgets` | Budget tracking |
| `debts` | Debt management |
| `investment_vehicles` | Investment accounts |
| `investment_holdings` | Holdings |
| `groups` | Shared access |
| `user_memberships` | Group memberships |

## Services (Local Development)
| Service | Port | URL |
|---------|------|-----|
| BlackieFi App | 3000 | http://localhost:3000 |
| Supabase API | 8000 | http://localhost:8000 |
| Supabase Studio | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Inbucket (Email) | 9000 | http://localhost:9000 |

## Quick Start Commands
```bash
# Full self-hosted stack
docker compose up -d

# Simplified (Supabase Cloud)
docker compose -f docker-compose.simple.yml up -d

# Production build
docker build -t blackiefi:latest .
```

## Prioritized Backlog
- P0: ✅ Complete - SDK, Schema, Docker
- P1: Implement OpenAI integration for AI features
- P1: Data migration tool from Base44
- P2: Add Helm chart for Kubernetes
- P2: Add Terraform modules for cloud deployments
- P3: Implement real-time subscriptions

## Notes
- AI functions (InvokeLLM, etc.) return placeholder responses - need OpenAI key
- Dev user: `dev@localhost.com` / `dev123456`
- Migrations auto-run on docker-compose up
