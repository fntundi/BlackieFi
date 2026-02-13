# BlackieFi: Base44 to Supabase Migration Analysis

## Executive Summary

This document analyzes migrating the BlackieFi financial tracking application from Base44's platform to a fully self-hosted solution using the **base44-to-supabase-sdk**. This would enable:

- ✅ **Full self-hosting** - No dependency on Base44 platform
- ✅ **Zero code changes** - Drop-in SDK replacement
- ✅ **Complete data control** - Your data in your PostgreSQL
- ✅ **Containerizable** - Single Docker image deployment
- ✅ **Cost reduction** - Eliminate Base44 subscription fees

---

## Current Architecture Analysis

### BlackieFi Entity Map (from Base44)

Based on code analysis, BlackieFi uses these Base44 entities:

| Base44 Entity | Supabase Table | Operations Used |
|---------------|----------------|-----------------|
| `Transaction` | `transactions` | list, filter, create, update, delete |
| `RecurringTransaction` | `recurring_transactions` | list, filter, create, update |
| `Debt` | `debts` | list, filter, create, update |
| `Budget` | `budgets` | list, filter, create |
| `Category` | `categories` | list, filter |
| `Entity` | `entities` | list, filter (financial entities/accounts) |
| `InvestmentVehicle` | `investment_vehicles` | list, filter |
| `InvestmentHolding` | `investment_holdings` | list, filter |
| `Group` | `groups` | list, filter |
| `UserMembership` | `user_memberships` | list, filter |

### Base44 Functions Used

The `/functions/*.ts` files use Base44's serverless runtime with these integrations:

| Function | Base44 Integration | Supabase Replacement |
|----------|-------------------|---------------------|
| `analyzePortfolio.ts` | `InvokeLLM` | OpenAI API |
| `analyzeDebtRepayment.ts` | `InvokeLLM` | OpenAI API |
| `analyzeMarketNews.ts` | `InvokeLLM` | OpenAI API |
| `forecastBudget.ts` | `InvokeLLM` | OpenAI API |
| `generateBudget.ts` | `InvokeLLM` | OpenAI API |
| `generateInvestmentStrategy.ts` | `InvokeLLM` | OpenAI API |
| `categorizeTransaction.ts` | `InvokeLLM` | OpenAI API |
| `detectBills.ts` | `InvokeLLM` | OpenAI API |
| `processRecurringTransactions.ts` | Entity CRUD | Supabase SDK |
| `getAccessibleEntities.ts` | Entity CRUD | Supabase SDK |

---

## Migration Implementation Plan

### Phase 1: SDK Replacement (Zero Code Changes)

#### Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js
```

#### Step 2: Add SDK Files

Create these files in your project:

**`src/lib/supabase-client.js`**
```javascript
import { createClient } from '@supabase/supabase-js'

const getEnvVar = (key, defaultValue) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || defaultValue
  }
  return process.env[key] || defaultValue
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', '')
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', '')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**`src/lib/custom-sdk.js`** - Copy from base44-to-supabase-sdk repository

**`src/api/base44Client.js`** - Replace with:
```javascript
import { customClient } from "../lib/custom-sdk.js";

// Export the custom client as base44 for compatibility
export const base44 = customClient;
```

#### Step 3: Environment Variables

Update `.env.local`:
```env
# Supabase Configuration (replaces Base44 vars)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

### Phase 2: Database Schema

Create `supabase/migrations/001_blackiefi_schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  email_verified BOOLEAN DEFAULT FALSE
);

-- ============================================
-- ENTITIES (Financial Accounts)
-- ============================================
CREATE TABLE entities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('personal', 'business', 'investment')),
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  color TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense', 'transfer')),
  notes TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_transaction_id UUID
);

-- ============================================
-- RECURRING TRANSACTIONS
-- ============================================
CREATE TABLE recurring_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  next_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  auto_create BOOLEAN DEFAULT FALSE
);

-- ============================================
-- BUDGETS
-- ============================================
CREATE TABLE budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  period TEXT CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- DEBTS
-- ============================================
CREATE TABLE debts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('credit_card', 'loan', 'mortgage', 'student_loan', 'auto_loan', 'other')),
  original_balance DECIMAL(12,2),
  current_balance DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2),
  minimum_payment DECIMAL(12,2),
  due_date INTEGER, -- Day of month
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- INVESTMENT VEHICLES
-- ============================================
CREATE TABLE investment_vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('brokerage', '401k', 'ira', 'roth_ira', 'hsa', 'other')),
  institution TEXT,
  account_number TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- INVESTMENT HOLDINGS
-- ============================================
CREATE TABLE investment_holdings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vehicle_id UUID REFERENCES investment_vehicles(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_class TEXT CHECK (asset_class IN ('stocks', 'bonds', 'cash', 'real_estate', 'crypto', 'commodities', 'other')),
  quantity DECIMAL(18,8),
  cost_basis DECIMAL(12,2),
  current_price DECIMAL(12,2),
  benchmark_symbol TEXT
);

-- ============================================
-- GROUPS (for shared access)
-- ============================================
CREATE TABLE groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- USER MEMBERSHIPS (group membership)
-- ============================================
CREATE TABLE user_memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  UNIQUE(user_id, entity_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_transactions_entity ON transactions(entity_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_recurring_entity ON recurring_transactions(entity_id);
CREATE INDEX idx_budgets_entity ON budgets(entity_id);
CREATE INDEX idx_debts_entity ON debts(entity_id);
CREATE INDEX idx_holdings_vehicle ON investment_holdings(vehicle_id);
CREATE INDEX idx_memberships_user ON user_memberships(user_id);
CREATE INDEX idx_memberships_entity ON user_memberships(entity_id);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurring_updated_at BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON investment_vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON investment_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### Phase 3: Row Level Security

Create `supabase/migrations/002_rls_policies.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES
-- ============================================
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- ENTITIES POLICIES (with membership access)
-- ============================================
CREATE POLICY "Users can view their entities" ON entities
  FOR SELECT USING (
    user_id = auth.uid() OR
    id IN (SELECT entity_id FROM user_memberships WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can create entities" ON entities
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their entities" ON entities
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their entities" ON entities
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- TRANSACTIONS POLICIES
-- ============================================
CREATE POLICY "Users can view their transactions" ON transactions
  FOR SELECT USING (
    entity_id IN (
      SELECT id FROM entities WHERE user_id = auth.uid()
      UNION
      SELECT entity_id FROM user_memberships WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create transactions" ON transactions
  FOR INSERT WITH CHECK (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update their transactions" ON transactions
  FOR UPDATE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete their transactions" ON transactions
  FOR DELETE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

-- Similar policies for other entity-scoped tables...
-- (categories, recurring_transactions, budgets, debts, investment_vehicles)
```

---

### Phase 4: Functions Migration

The Base44 serverless functions need to be converted. Options:

#### Option A: Supabase Edge Functions (Recommended)

Convert Deno functions to Supabase Edge Functions:

**`supabase/functions/analyze-portfolio/index.ts`**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })
  
  // ... rest of function logic
})
```

#### Option B: Move to Frontend

For simpler AI calls, use the SDK's `InvokeLLM` integration directly:

```javascript
// In your React component
const response = await base44.integrations.Core.InvokeLLM({
  prompt: "Analyze this portfolio...",
  response_json_schema: { /* schema */ }
});
```

This requires implementing the OpenAI integration in `custom-sdk.js`.

---

### Phase 5: Docker Containerization

Update the Dockerfile to include Supabase:

```dockerfile
# =============================================================================
# Stage 1: Build Environment
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build-time Supabase configuration
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV NODE_ENV=production

RUN npm run build

# =============================================================================
# Stage 2: Production Runtime
# =============================================================================
FROM nginx:alpine AS production

RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

USER appuser

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

---

## Complete Self-Hosted Stack

### docker-compose.yml (Full Stack)

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: blackiefi-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: blackiefi
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Supabase (self-hosted) OR use Supabase Cloud
  # For self-hosted Supabase, see: https://supabase.com/docs/guides/self-hosting
  
  # BlackieFi Frontend
  blackiefi:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
    image: blackiefi:${TAG:-latest}
    container_name: blackiefi-app
    ports:
      - "8080:8080"
    environment:
      - RUNTIME_SUPABASE_URL=${RUNTIME_SUPABASE_URL:-}
      - RUNTIME_SUPABASE_ANON_KEY=${RUNTIME_SUPABASE_ANON_KEY:-}
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

---

## Migration Effort Estimate

| Task | Effort | Complexity |
|------|--------|------------|
| SDK Replacement | 1 hour | Low |
| Environment Setup | 1 hour | Low |
| Database Schema | 2-3 hours | Medium |
| RLS Policies | 2 hours | Medium |
| Data Migration | 2-4 hours | Medium |
| Functions Conversion | 4-8 hours | High |
| Testing | 4-6 hours | Medium |
| **Total** | **16-25 hours** | **Medium** |

---

## Benefits After Migration

| Aspect | Before (Base44) | After (Self-Hosted) |
|--------|-----------------|---------------------|
| Monthly Cost | Base44 subscription | ~$25 (Supabase Pro) or $0 (self-hosted) |
| Data Location | Base44 servers | Your infrastructure |
| Vendor Lock-in | Yes | No |
| Customization | Limited | Unlimited |
| Deployment | Base44 only | Any platform |
| Scaling | Base44 limits | Your choice |

---

## Next Steps

1. **Create Supabase Project** at supabase.com (or self-host)
2. **Export Data** from Base44 (see export prompt in guide)
3. **Apply SDK Replacement** - Copy the 3 files
4. **Run Migrations** - Create database schema
5. **Import Data** - Load your existing data
6. **Test Thoroughly** - Verify all functionality
7. **Deploy** - Build and deploy container

Would you like me to implement any of these phases in your codebase?
