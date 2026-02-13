-- =============================================================================
-- BlackieFi Database Schema
-- Migration: 001_initial_schema.sql
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  email_verified BOOLEAN DEFAULT FALSE
);

-- =============================================================================
-- ENTITIES (Financial Accounts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS entities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('personal', 'business', 'investment')),
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE
);

-- =============================================================================
-- CATEGORIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
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

-- =============================================================================
-- TRANSACTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
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

-- =============================================================================
-- RECURRING TRANSACTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS recurring_transactions (
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

-- =============================================================================
-- BUDGETS
-- =============================================================================
CREATE TABLE IF NOT EXISTS budgets (
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

-- =============================================================================
-- DEBTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS debts (
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
  due_date INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

-- =============================================================================
-- INVESTMENT VEHICLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS investment_vehicles (
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

-- =============================================================================
-- INVESTMENT HOLDINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS investment_holdings (
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

-- =============================================================================
-- GROUPS (for shared access)
-- =============================================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================================================
-- USER MEMBERSHIPS (group membership)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  UNIQUE(user_id, entity_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_entity ON transactions(entity_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_recurring_entity ON recurring_transactions(entity_id);
CREATE INDEX IF NOT EXISTS idx_budgets_entity ON budgets(entity_id);
CREATE INDEX IF NOT EXISTS idx_debts_entity ON debts(entity_id);
CREATE INDEX IF NOT EXISTS idx_holdings_vehicle ON investment_holdings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_entity ON user_memberships(entity_id);
CREATE INDEX IF NOT EXISTS idx_entities_user ON entities(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_entity ON categories(entity_id);

-- =============================================================================
-- TRIGGERS FOR updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_updated_at ON recurring_transactions;
CREATE TRIGGER update_recurring_updated_at BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_debts_updated_at ON debts;
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON investment_vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON investment_vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_holdings_updated_at ON investment_holdings;
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON investment_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_memberships_updated_at ON user_memberships;
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON user_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
