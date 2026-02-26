package database

import (
	"context"
	"fmt"
	"log"
)

func RunMigrations() error {
	ctx := context.Background()

	migrations := []string{
		// System Settings (AI feature flags)
		`CREATE TABLE IF NOT EXISTS system_settings (
			id SERIAL PRIMARY KEY,
			ai_enabled BOOLEAN DEFAULT FALSE,
			default_llm_provider VARCHAR(50) DEFAULT 'openai',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Users
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			username VARCHAR(100) UNIQUE NOT NULL,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			full_name VARCHAR(255),
			role VARCHAR(50) DEFAULT 'user',
			ai_enabled BOOLEAN DEFAULT FALSE,
			preferred_llm_provider VARCHAR(50) DEFAULT 'openai',
			password_reset_token VARCHAR(255),
			password_reset_expires TIMESTAMP,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Entities (personal/business)
		`CREATE TABLE IF NOT EXISTS entities (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			type VARCHAR(50) NOT NULL DEFAULT 'personal',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Accounts
		`CREATE TABLE IF NOT EXISTS accounts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			type VARCHAR(50) NOT NULL DEFAULT 'checking',
			balance DECIMAL(15,2) DEFAULT 0,
			currency VARCHAR(10) DEFAULT 'USD',
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Categories
		`CREATE TABLE IF NOT EXISTS categories (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
			name VARCHAR(255) NOT NULL,
			type VARCHAR(50) DEFAULT 'expense',
			auto_categorization_rules TEXT[],
			is_default BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Transactions
		`CREATE TABLE IF NOT EXISTS transactions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
			category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
			type VARCHAR(50) NOT NULL DEFAULT 'expense',
			amount DECIMAL(15,2) NOT NULL,
			date DATE NOT NULL,
			description TEXT,
			linked_asset_id UUID,
			linked_inventory_id UUID,
			ai_tags TEXT[],
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Recurring Transactions
		`CREATE TABLE IF NOT EXISTS recurring_transactions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
			category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
			name VARCHAR(255) NOT NULL,
			type VARCHAR(50) NOT NULL DEFAULT 'expense',
			amount DECIMAL(15,2) NOT NULL,
			frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
			next_date DATE NOT NULL,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Budgets
		`CREATE TABLE IF NOT EXISTS budgets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			month VARCHAR(7) NOT NULL,
			category_budgets JSONB DEFAULT '[]',
			total_planned DECIMAL(15,2) DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(entity_id, month)
		)`,

		// Debts
		`CREATE TABLE IF NOT EXISTS debts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
			name VARCHAR(255) NOT NULL,
			type VARCHAR(50) DEFAULT 'loan',
			original_amount DECIMAL(15,2) NOT NULL,
			current_balance DECIMAL(15,2) NOT NULL,
			interest_rate DECIMAL(5,2),
			minimum_payment DECIMAL(15,2),
			payment_frequency VARCHAR(50) DEFAULT 'monthly',
			next_payment_date DATE,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Investment Vehicles
		`CREATE TABLE IF NOT EXISTS investment_vehicles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			type VARCHAR(50) NOT NULL DEFAULT 'brokerage',
			provider VARCHAR(255),
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Investment Holdings
		`CREATE TABLE IF NOT EXISTS investment_holdings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			vehicle_id UUID REFERENCES investment_vehicles(id) ON DELETE CASCADE,
			asset_name VARCHAR(255) NOT NULL,
			asset_class VARCHAR(50) DEFAULT 'stocks',
			quantity DECIMAL(20,8) NOT NULL,
			cost_basis DECIMAL(15,2) NOT NULL,
			current_price DECIMAL(15,4),
			benchmark_symbol VARCHAR(20),
			last_updated DATE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Assets
		`CREATE TABLE IF NOT EXISTS assets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			type VARCHAR(50) NOT NULL DEFAULT 'equipment',
			description TEXT,
			purchase_date DATE,
			purchase_price DECIMAL(15,2),
			current_value DECIMAL(15,2),
			depreciation_method VARCHAR(50) DEFAULT 'straight_line',
			useful_life_years INTEGER,
			salvage_value DECIMAL(15,2) DEFAULT 0,
			location VARCHAR(255),
			serial_number VARCHAR(255),
			vendor VARCHAR(255),
			warranty_expiration DATE,
			maintenance_schedule TEXT,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Inventory
		`CREATE TABLE IF NOT EXISTS inventory (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			sku VARCHAR(100),
			quantity INTEGER DEFAULT 0,
			unit_cost DECIMAL(15,2),
			selling_price DECIMAL(15,2),
			reorder_point INTEGER DEFAULT 0,
			category VARCHAR(100),
			location VARCHAR(255),
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Financial Goals
		`CREATE TABLE IF NOT EXISTS financial_goals (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			goal_type VARCHAR(50) DEFAULT 'savings',
			target_amount DECIMAL(15,2) NOT NULL,
			current_amount DECIMAL(15,2) DEFAULT 0,
			deadline DATE,
			monthly_contribution DECIMAL(15,2) DEFAULT 0,
			priority VARCHAR(20) DEFAULT 'medium',
			status VARCHAR(20) DEFAULT 'active',
			notes TEXT,
			ai_recommendations TEXT[],
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Groups
		`CREATE TABLE IF NOT EXISTS groups (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) NOT NULL,
			description TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Group Members
		`CREATE TABLE IF NOT EXISTS group_members (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
			user_id UUID REFERENCES users(id) ON DELETE CASCADE,
			role VARCHAR(50) DEFAULT 'member',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(group_id, user_id)
		)`,

		// Group Entity Access
		`CREATE TABLE IF NOT EXISTS group_entity_access (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			permissions JSONB DEFAULT '{"read": true, "write": false}',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(group_id, entity_id)
		)`,

		// Categorization Learning
		`CREATE TABLE IF NOT EXISTS categorization_learning (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
			transaction_description TEXT,
			transaction_amount DECIMAL(15,2),
			suggested_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
			actual_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
			was_correction BOOLEAN DEFAULT FALSE,
			correction_count INTEGER DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Indexes for performance
		`CREATE INDEX IF NOT EXISTS idx_transactions_entity_date ON transactions(entity_id, date DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)`,
		`CREATE INDEX IF NOT EXISTS idx_recurring_entity ON recurring_transactions(entity_id)`,
		`CREATE INDEX IF NOT EXISTS idx_debts_entity ON debts(entity_id)`,
		`CREATE INDEX IF NOT EXISTS idx_holdings_vehicle ON investment_holdings(vehicle_id)`,
		`CREATE INDEX IF NOT EXISTS idx_assets_entity ON assets(entity_id)`,
		`CREATE INDEX IF NOT EXISTS idx_goals_entity ON financial_goals(entity_id)`,
	}

	for i, migration := range migrations {
		_, err := DB.Exec(ctx, migration)
		if err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}

	// Insert default system settings if not exists
	_, err := DB.Exec(ctx, `
		INSERT INTO system_settings (id, ai_enabled, default_llm_provider)
		VALUES (1, FALSE, 'openai')
		ON CONFLICT (id) DO NOTHING
	`)
	if err != nil {
		return fmt.Errorf("failed to insert default system settings: %w", err)
	}

	log.Println("✅ Database migrations completed")
	return nil
}
