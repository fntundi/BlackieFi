# BlackieFi - Self-Hosted Financial Tracker

A comprehensive personal finance tracking application migrated from Base44 to self-hosted Supabase infrastructure.

## 🚀 Quick Start

### Option 1: Full Self-Hosted Stack (Recommended)

This runs the complete Supabase stack locally:

```bash
# Start all services
docker compose up -d

# Wait for services to be healthy (~30-60 seconds)
docker compose ps

# Access the application
open http://localhost:3000

# Access Supabase Studio (Database UI)
open http://localhost:3001

# View logs
docker compose logs -f app
```

### Option 2: Simplified Setup (Supabase Cloud)

Use Supabase Cloud instead of self-hosted:

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the database migrations in Supabase SQL Editor
3. Configure environment:

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

4. Start the app:

```bash
docker compose -f docker-compose.simple.yml up -d
```

### Option 3: Local Development (No Docker)

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations in Supabase
# Copy contents of supabase/migrations/*.sql to SQL Editor

# Start development server
npm run dev
```

## 📁 Project Structure

```
├── src/
│   ├── api/
│   │   └── base44Client.js      # Supabase SDK (drop-in Base44 replacement)
│   ├── lib/
│   │   ├── supabase-client.js   # Supabase connection
│   │   └── custom-sdk.js        # Universal SDK implementation
│   ├── components/              # React components
│   ├── pages/                   # Page components
│   └── ...
├── supabase/
│   └── migrations/              # Database schema
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_seed_data.sql
├── docker/
│   └── kong.yml                 # API Gateway config
├── docker-compose.yml           # Full self-hosted stack
├── docker-compose.simple.yml    # Simplified (Supabase Cloud)
├── Dockerfile                   # Production build
├── Dockerfile.dev               # Development build
└── nginx.conf                   # Production web server
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | For admin ops |
| `VITE_OPENAI_ENABLED` | Enable AI features (`true`/`false`) | No (default: `false`) |
| `VITE_OPENAI_API_KEY` | OpenAI API key | When AI enabled |
| `VITE_OPENAI_MODEL` | OpenAI model to use | No (default: `gpt-4o-mini`) |

### OpenAI Integration

AI features (portfolio analysis, budget forecasting, market insights) are **disabled by default**.

To enable:

```bash
# In .env.local
VITE_OPENAI_ENABLED=true
VITE_OPENAI_API_KEY=sk-your-openai-api-key
VITE_OPENAI_MODEL=gpt-4o-mini  # Optional: gpt-4o, gpt-4-turbo, etc.
```

When disabled, AI features return sensible placeholder responses.

### Local Development Defaults

When using the full docker-compose stack, these are pre-configured:

- **Supabase URL**: `http://localhost:8000`
- **Supabase Studio**: `http://localhost:3001`
- **PostgreSQL**: `localhost:5432` (user: postgres, pass: postgres)
- **Email Testing**: `http://localhost:9000` (Inbucket)

## 🗄️ Database

### Tables

| Table | Description |
|-------|-------------|
| `users` | User profiles |
| `entities` | Financial accounts (personal, business, investment) |
| `categories` | Transaction categories |
| `transactions` | Financial transactions |
| `recurring_transactions` | Recurring payments/income |
| `budgets` | Budget tracking |
| `debts` | Debt management |
| `investment_vehicles` | Investment accounts |
| `investment_holdings` | Individual holdings |
| `groups` | Shared access groups |
| `user_memberships` | Group memberships |

### Running Migrations

**Self-hosted (automatic):**
Migrations run automatically when the database container starts.

**Supabase Cloud:**
1. Go to SQL Editor in Supabase Dashboard
2. Run each file in `supabase/migrations/` in order

## 🔐 Authentication

### Development Login

The dev user is auto-created on first login:
- **Email**: `dev@localhost.com`
- **Password**: `dev123456`
- **Role**: `admin`

### Production

Configure OAuth providers in Supabase Dashboard:
- Google
- GitHub
- Email/Password

## 🐳 Docker Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f [service]

# Rebuild after code changes
docker compose build app
docker compose up -d app

# Access database
docker compose exec db psql -U postgres

# Reset database
docker compose down -v
docker compose up -d
```

## 🏗️ Production Deployment

### Build Production Image

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key \
  -t blackiefi:latest .
```

### Run Production Container

```bash
docker run -d \
  -p 8080:8080 \
  --name blackiefi \
  blackiefi:latest
```

### Runtime Environment Override

```bash
docker run -d \
  -p 8080:8080 \
  -e RUNTIME_SUPABASE_URL=https://prod.supabase.co \
  -e RUNTIME_SUPABASE_ANON_KEY=prod-key \
  blackiefi:latest
```

## 📊 Service URLs (Self-Hosted)

| Service | URL | Description |
|---------|-----|-------------|
| App | http://localhost:3000 | BlackieFi application |
| Supabase API | http://localhost:8000 | REST/Auth/Realtime |
| Supabase Studio | http://localhost:3001 | Database admin UI |
| PostgreSQL | localhost:5432 | Direct database access |
| Inbucket | http://localhost:9000 | Email testing UI |

## 🔄 Migration from Base44

This project uses a drop-in SDK replacement that provides 100% API compatibility:

```javascript
// Before (Base44)
import { base44 } from '@/api/base44Client';
const posts = await base44.entities.BlogPost.list();

// After (Supabase) - Same code works!
import { base44 } from '@/api/base44Client';
const posts = await base44.entities.BlogPost.list();
```

The SDK automatically:
- Converts entity names to table names (`BlogPost` → `blog_posts`)
- Maps field names (`created_date` → `created_at`)
- Handles authentication
- Applies appropriate security (service role for sensitive tables)

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
