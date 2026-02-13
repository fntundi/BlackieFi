-- =============================================================================
-- BlackieFi Seed Data for Development
-- Migration: 003_seed_data.sql
-- =============================================================================

-- Note: This creates sample data for development/testing
-- The dev user is created automatically by the auth system on first login

-- Sample categories (will be linked to entities after user creates them)
INSERT INTO categories (id, name, type, color, icon, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Salary', 'income', '#22c55e', 'briefcase', true),
  ('00000000-0000-0000-0000-000000000002', 'Freelance', 'income', '#3b82f6', 'code', true),
  ('00000000-0000-0000-0000-000000000003', 'Investments', 'income', '#8b5cf6', 'trending-up', true),
  ('00000000-0000-0000-0000-000000000004', 'Housing', 'expense', '#ef4444', 'home', true),
  ('00000000-0000-0000-0000-000000000005', 'Transportation', 'expense', '#f97316', 'car', true),
  ('00000000-0000-0000-0000-000000000006', 'Food & Dining', 'expense', '#eab308', 'utensils', true),
  ('00000000-0000-0000-0000-000000000007', 'Utilities', 'expense', '#06b6d4', 'zap', true),
  ('00000000-0000-0000-0000-000000000008', 'Entertainment', 'expense', '#ec4899', 'film', true),
  ('00000000-0000-0000-0000-000000000009', 'Healthcare', 'expense', '#14b8a6', 'heart', true),
  ('00000000-0000-0000-0000-000000000010', 'Shopping', 'expense', '#a855f7', 'shopping-bag', true)
ON CONFLICT (id) DO NOTHING;
