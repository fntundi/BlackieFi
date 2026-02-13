-- =============================================================================
-- BlackieFi Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- =============================================================================

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

-- =============================================================================
-- USERS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================================
-- ENTITIES POLICIES (with membership access)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their entities" ON entities;
CREATE POLICY "Users can view their entities" ON entities
  FOR SELECT USING (
    user_id = auth.uid() OR
    id IN (SELECT entity_id FROM user_memberships WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create entities" ON entities;
CREATE POLICY "Users can create entities" ON entities
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their entities" ON entities;
CREATE POLICY "Users can update their entities" ON entities
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their entities" ON entities;
CREATE POLICY "Users can delete their entities" ON entities
  FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- CATEGORIES POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their categories" ON categories;
CREATE POLICY "Users can view their categories" ON categories
  FOR SELECT USING (
    entity_id IN (
      SELECT id FROM entities WHERE user_id = auth.uid()
      UNION
      SELECT entity_id FROM user_memberships WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create categories" ON categories;
CREATE POLICY "Users can create categories" ON categories
  FOR INSERT WITH CHECK (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their categories" ON categories;
CREATE POLICY "Users can update their categories" ON categories
  FOR UPDATE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their categories" ON categories;
CREATE POLICY "Users can delete their categories" ON categories
  FOR DELETE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

-- =============================================================================
-- TRANSACTIONS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
CREATE POLICY "Users can view their transactions" ON transactions
  FOR SELECT USING (
    entity_id IN (
      SELECT id FROM entities WHERE user_id = auth.uid()
      UNION
      SELECT entity_id FROM user_memberships WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
CREATE POLICY "Users can create transactions" ON transactions
  FOR INSERT WITH CHECK (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their transactions" ON transactions;
CREATE POLICY "Users can update their transactions" ON transactions
  FOR UPDATE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their transactions" ON transactions;
CREATE POLICY "Users can delete their transactions" ON transactions
  FOR DELETE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

-- =============================================================================
-- RECURRING TRANSACTIONS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can view their recurring transactions" ON recurring_transactions
  FOR SELECT USING (
    entity_id IN (
      SELECT id FROM entities WHERE user_id = auth.uid()
      UNION
      SELECT entity_id FROM user_memberships WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can create recurring transactions" ON recurring_transactions
  FOR INSERT WITH CHECK (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can update their recurring transactions" ON recurring_transactions
  FOR UPDATE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can delete their recurring transactions" ON recurring_transactions
  FOR DELETE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

-- =============================================================================
-- BUDGETS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their budgets" ON budgets;
CREATE POLICY "Users can view their budgets" ON budgets
  FOR SELECT USING (
    entity_id IN (
      SELECT id FROM entities WHERE user_id = auth.uid()
      UNION
      SELECT entity_id FROM user_memberships WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create budgets" ON budgets;
CREATE POLICY "Users can create budgets" ON budgets
  FOR INSERT WITH CHECK (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their budgets" ON budgets;
CREATE POLICY "Users can update their budgets" ON budgets
  FOR UPDATE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their budgets" ON budgets;
CREATE POLICY "Users can delete their budgets" ON budgets
  FOR DELETE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

-- =============================================================================
-- DEBTS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their debts" ON debts;
CREATE POLICY "Users can view their debts" ON debts
  FOR SELECT USING (
    entity_id IN (
      SELECT id FROM entities WHERE user_id = auth.uid()
      UNION
      SELECT entity_id FROM user_memberships WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create debts" ON debts;
CREATE POLICY "Users can create debts" ON debts
  FOR INSERT WITH CHECK (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their debts" ON debts;
CREATE POLICY "Users can update their debts" ON debts
  FOR UPDATE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their debts" ON debts;
CREATE POLICY "Users can delete their debts" ON debts
  FOR DELETE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

-- =============================================================================
-- INVESTMENT VEHICLES POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their investment vehicles" ON investment_vehicles;
CREATE POLICY "Users can view their investment vehicles" ON investment_vehicles
  FOR SELECT USING (
    entity_id IN (
      SELECT id FROM entities WHERE user_id = auth.uid()
      UNION
      SELECT entity_id FROM user_memberships WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create investment vehicles" ON investment_vehicles;
CREATE POLICY "Users can create investment vehicles" ON investment_vehicles
  FOR INSERT WITH CHECK (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their investment vehicles" ON investment_vehicles;
CREATE POLICY "Users can update their investment vehicles" ON investment_vehicles
  FOR UPDATE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their investment vehicles" ON investment_vehicles;
CREATE POLICY "Users can delete their investment vehicles" ON investment_vehicles
  FOR DELETE USING (
    entity_id IN (SELECT id FROM entities WHERE user_id = auth.uid())
  );

-- =============================================================================
-- INVESTMENT HOLDINGS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their investment holdings" ON investment_holdings;
CREATE POLICY "Users can view their investment holdings" ON investment_holdings
  FOR SELECT USING (
    vehicle_id IN (
      SELECT id FROM investment_vehicles WHERE entity_id IN (
        SELECT id FROM entities WHERE user_id = auth.uid()
        UNION
        SELECT entity_id FROM user_memberships WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can create investment holdings" ON investment_holdings;
CREATE POLICY "Users can create investment holdings" ON investment_holdings
  FOR INSERT WITH CHECK (
    vehicle_id IN (
      SELECT id FROM investment_vehicles WHERE entity_id IN (
        SELECT id FROM entities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their investment holdings" ON investment_holdings;
CREATE POLICY "Users can update their investment holdings" ON investment_holdings
  FOR UPDATE USING (
    vehicle_id IN (
      SELECT id FROM investment_vehicles WHERE entity_id IN (
        SELECT id FROM entities WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their investment holdings" ON investment_holdings;
CREATE POLICY "Users can delete their investment holdings" ON investment_holdings
  FOR DELETE USING (
    vehicle_id IN (
      SELECT id FROM investment_vehicles WHERE entity_id IN (
        SELECT id FROM entities WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- GROUPS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
CREATE POLICY "Users can view their groups" ON groups
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT group_id FROM user_memberships WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create groups" ON groups;
CREATE POLICY "Users can create groups" ON groups
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their groups" ON groups;
CREATE POLICY "Users can update their groups" ON groups
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their groups" ON groups;
CREATE POLICY "Users can delete their groups" ON groups
  FOR DELETE USING (owner_id = auth.uid());

-- =============================================================================
-- USER MEMBERSHIPS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their memberships" ON user_memberships;
CREATE POLICY "Users can view their memberships" ON user_memberships
  FOR SELECT USING (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Group owners can create memberships" ON user_memberships;
CREATE POLICY "Group owners can create memberships" ON user_memberships
  FOR INSERT WITH CHECK (
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Group owners can update memberships" ON user_memberships;
CREATE POLICY "Group owners can update memberships" ON user_memberships
  FOR UPDATE USING (
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Group owners can delete memberships" ON user_memberships;
CREATE POLICY "Group owners can delete memberships" ON user_memberships
  FOR DELETE USING (
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  );
