package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/blackiefi/backend/internal/utils"
	"github.com/google/uuid"
)

func SeedDatabase() error {
	ctx := context.Background()

	// Check if data already exists
	var count int
	err := DB.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check existing data: %w", err)
	}
	if count > 0 {
		log.Println("⚠️  Database already has data, skipping seed")
		return nil
	}

	log.Println("🌱 Seeding database with test data...")

	// Create admin user
	adminPassword, _ := utils.HashPassword("admin123")
	var adminID uuid.UUID
	err = DB.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash, full_name, role, ai_enabled)
		VALUES ('admin', 'admin@blackiefi.com', $1, 'System Administrator', 'admin', false)
		RETURNING id
	`, adminPassword).Scan(&adminID)
	if err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	// Create test user
	userPassword, _ := utils.HashPassword("user123")
	var userID uuid.UUID
	err = DB.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash, full_name, role, ai_enabled)
		VALUES ('testuser', 'test@blackiefi.com', $1, 'Test User', 'user', false)
		RETURNING id
	`, userPassword).Scan(&userID)
	if err != nil {
		return fmt.Errorf("failed to create test user: %w", err)
	}

	// Create entities
	var personalEntityID, businessEntityID uuid.UUID
	err = DB.QueryRow(ctx, `
		INSERT INTO entities (owner_id, name, type)
		VALUES ($1, 'Personal Finances', 'personal')
		RETURNING id
	`, userID).Scan(&personalEntityID)
	if err != nil {
		return fmt.Errorf("failed to create personal entity: %w", err)
	}

	err = DB.QueryRow(ctx, `
		INSERT INTO entities (owner_id, name, type)
		VALUES ($1, 'My Business LLC', 'business')
		RETURNING id
	`, userID).Scan(&businessEntityID)
	if err != nil {
		return fmt.Errorf("failed to create business entity: %w", err)
	}

	// Create accounts
	var checkingID, savingsID, creditCardID uuid.UUID
	err = DB.QueryRow(ctx, `
		INSERT INTO accounts (entity_id, name, type, balance, currency)
		VALUES ($1, 'Main Checking', 'checking', 5420.50, 'USD')
		RETURNING id
	`, personalEntityID).Scan(&checkingID)
	if err != nil {
		return fmt.Errorf("failed to create checking account: %w", err)
	}

	err = DB.QueryRow(ctx, `
		INSERT INTO accounts (entity_id, name, type, balance, currency)
		VALUES ($1, 'Savings Account', 'savings', 15000.00, 'USD')
		RETURNING id
	`, personalEntityID).Scan(&savingsID)
	if err != nil {
		return fmt.Errorf("failed to create savings account: %w", err)
	}

	err = DB.QueryRow(ctx, `
		INSERT INTO accounts (entity_id, name, type, balance, currency)
		VALUES ($1, 'Credit Card', 'credit_card', -1250.00, 'USD')
		RETURNING id
	`, personalEntityID).Scan(&creditCardID)
	if err != nil {
		return fmt.Errorf("failed to create credit card account: %w", err)
	}

	// Create business account
	var bizCheckingID uuid.UUID
	err = DB.QueryRow(ctx, `
		INSERT INTO accounts (entity_id, name, type, balance, currency)
		VALUES ($1, 'Business Checking', 'checking', 45000.00, 'USD')
		RETURNING id
	`, businessEntityID).Scan(&bizCheckingID)
	if err != nil {
		return fmt.Errorf("failed to create business account: %w", err)
	}

	// Create categories
	categories := []struct {
		Name    string
		Type    string
		Rules   string
		Default bool
	}{
		{"Groceries", "expense", "{walmart,target,costco,kroger}", true},
		{"Utilities", "expense", "{electric,water,gas,internet}", true},
		{"Transportation", "expense", "{uber,lyft,gas station,parking}", true},
		{"Entertainment", "expense", "{netflix,spotify,movies,games}", true},
		{"Dining Out", "expense", "{restaurant,doordash,grubhub}", true},
		{"Healthcare", "expense", "{pharmacy,doctor,hospital}", true},
		{"Salary", "income", "{payroll,direct deposit}", true},
		{"Freelance Income", "income", "{consulting,freelance}", true},
		{"Investment Income", "income", "{dividend,interest}", false},
		{"Office Supplies", "expense", "{staples,office depot}", false},
		{"Software", "expense", "{subscription,license}", false},
	}

	categoryIDs := make(map[string]uuid.UUID)
	for _, cat := range categories {
		var catID uuid.UUID
		err = DB.QueryRow(ctx, `
			INSERT INTO categories (entity_id, name, type, auto_categorization_rules, is_default)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`, personalEntityID, cat.Name, cat.Type, cat.Rules, cat.Default).Scan(&catID)
		if err != nil {
			log.Printf("Warning: failed to create category %s: %v", cat.Name, err)
			continue
		}
		categoryIDs[cat.Name] = catID
	}

	// Create transactions
	transactions := []struct {
		Type        string
		Amount      float64
		Date        string
		Description string
		Category    string
		AccountID   uuid.UUID
	}{
		{"expense", 125.50, time.Now().AddDate(0, 0, -1).Format("2006-01-02"), "Weekly groceries at Walmart", "Groceries", checkingID},
		{"expense", 85.00, time.Now().AddDate(0, 0, -2).Format("2006-01-02"), "Electric bill", "Utilities", checkingID},
		{"expense", 45.00, time.Now().AddDate(0, 0, -3).Format("2006-01-02"), "Uber rides", "Transportation", checkingID},
		{"expense", 15.99, time.Now().AddDate(0, 0, -5).Format("2006-01-02"), "Netflix subscription", "Entertainment", creditCardID},
		{"expense", 65.00, time.Now().AddDate(0, 0, -7).Format("2006-01-02"), "Dinner at restaurant", "Dining Out", creditCardID},
		{"income", 4500.00, time.Now().AddDate(0, 0, -15).Format("2006-01-02"), "Salary deposit", "Salary", checkingID},
		{"income", 500.00, time.Now().AddDate(0, 0, -10).Format("2006-01-02"), "Freelance project", "Freelance Income", checkingID},
		{"expense", 200.00, time.Now().AddDate(0, 0, -12).Format("2006-01-02"), "Costco bulk shopping", "Groceries", checkingID},
		{"expense", 120.00, time.Now().AddDate(0, 0, -8).Format("2006-01-02"), "Internet bill", "Utilities", checkingID},
		{"expense", 50.00, time.Now().AddDate(0, 0, -4).Format("2006-01-02"), "Pharmacy", "Healthcare", creditCardID},
	}

	for _, tx := range transactions {
		catID := categoryIDs[tx.Category]
		_, err = DB.Exec(ctx, `
			INSERT INTO transactions (entity_id, account_id, category_id, type, amount, date, description)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, personalEntityID, tx.AccountID, catID, tx.Type, tx.Amount, tx.Date, tx.Description)
		if err != nil {
			log.Printf("Warning: failed to create transaction: %v", err)
		}
	}

	// Create recurring transactions
	recurring := []struct {
		Name      string
		Type      string
		Amount    float64
		Frequency string
		NextDate  string
		Category  string
	}{
		{"Rent Payment", "expense", 1500.00, "monthly", time.Now().AddDate(0, 1, 0).Format("2006-01-02"), "Utilities"},
		{"Car Insurance", "expense", 120.00, "monthly", time.Now().AddDate(0, 0, 15).Format("2006-01-02"), "Transportation"},
		{"Gym Membership", "expense", 50.00, "monthly", time.Now().AddDate(0, 0, 5).Format("2006-01-02"), "Healthcare"},
		{"Salary", "income", 4500.00, "biweekly", time.Now().AddDate(0, 0, 14).Format("2006-01-02"), "Salary"},
	}

	for _, rt := range recurring {
		catID := categoryIDs[rt.Category]
		_, err = DB.Exec(ctx, `
			INSERT INTO recurring_transactions (entity_id, category_id, name, type, amount, frequency, next_date, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, true)
		`, personalEntityID, catID, rt.Name, rt.Type, rt.Amount, rt.Frequency, rt.NextDate)
		if err != nil {
			log.Printf("Warning: failed to create recurring transaction: %v", err)
		}
	}

	// Create debts
	_, err = DB.Exec(ctx, `
		INSERT INTO debts (entity_id, account_id, name, type, original_amount, current_balance, interest_rate, minimum_payment, payment_frequency, next_payment_date, is_active)
		VALUES ($1, $2, 'Car Loan', 'loan', 25000.00, 18500.00, 5.5, 450.00, 'monthly', $3, true)
	`, personalEntityID, checkingID, time.Now().AddDate(0, 0, 20).Format("2006-01-02"))
	if err != nil {
		log.Printf("Warning: failed to create car loan: %v", err)
	}

	_, err = DB.Exec(ctx, `
		INSERT INTO debts (entity_id, account_id, name, type, original_amount, current_balance, interest_rate, minimum_payment, payment_frequency, next_payment_date, is_active)
		VALUES ($1, $2, 'Credit Card Balance', 'credit_card', 3000.00, 1250.00, 18.99, 50.00, 'monthly', $3, true)
	`, personalEntityID, creditCardID, time.Now().AddDate(0, 0, 25).Format("2006-01-02"))
	if err != nil {
		log.Printf("Warning: failed to create credit card debt: %v", err)
	}

	// Create investment vehicle and holdings
	var vehicleID uuid.UUID
	err = DB.QueryRow(ctx, `
		INSERT INTO investment_vehicles (entity_id, name, type, provider, is_active)
		VALUES ($1, '401(k) Retirement', '401k', 'Fidelity', true)
		RETURNING id
	`, personalEntityID).Scan(&vehicleID)
	if err != nil {
		log.Printf("Warning: failed to create investment vehicle: %v", err)
	} else {
		holdings := []struct {
			Name       string
			Class      string
			Qty        float64
			CostBasis  float64
			Price      float64
		}{
			{"AAPL", "stocks", 50, 7500.00, 185.50},
			{"VTI", "stocks", 100, 20000.00, 220.00},
			{"BND", "bonds", 75, 5625.00, 72.50},
			{"MSFT", "stocks", 25, 8000.00, 380.00},
		}

		for _, h := range holdings {
			_, err = DB.Exec(ctx, `
				INSERT INTO investment_holdings (vehicle_id, asset_name, asset_class, quantity, cost_basis, current_price)
				VALUES ($1, $2, $3, $4, $5, $6)
			`, vehicleID, h.Name, h.Class, h.Qty, h.CostBasis, h.Price)
			if err != nil {
				log.Printf("Warning: failed to create holding %s: %v", h.Name, err)
			}
		}
	}

	// Create financial goals
	_, err = DB.Exec(ctx, `
		INSERT INTO financial_goals (entity_id, name, goal_type, target_amount, current_amount, deadline, monthly_contribution, priority, status)
		VALUES ($1, 'Emergency Fund', 'emergency_fund', 20000.00, 15000.00, $2, 500.00, 'high', 'active')
	`, personalEntityID, time.Now().AddDate(0, 6, 0).Format("2006-01-02"))
	if err != nil {
		log.Printf("Warning: failed to create emergency fund goal: %v", err)
	}

	_, err = DB.Exec(ctx, `
		INSERT INTO financial_goals (entity_id, name, goal_type, target_amount, current_amount, deadline, monthly_contribution, priority, status)
		VALUES ($1, 'Vacation Fund', 'savings', 5000.00, 1200.00, $2, 200.00, 'medium', 'active')
	`, personalEntityID, time.Now().AddDate(1, 0, 0).Format("2006-01-02"))
	if err != nil {
		log.Printf("Warning: failed to create vacation goal: %v", err)
	}

	// Create assets
	_, err = DB.Exec(ctx, `
		INSERT INTO assets (entity_id, name, type, description, purchase_date, purchase_price, current_value, depreciation_method, useful_life_years, location, is_active)
		VALUES ($1, 'MacBook Pro 16"', 'technology', 'Work laptop', $2, 2499.00, 2000.00, 'straight_line', 5, 'Home Office', true)
	`, personalEntityID, time.Now().AddDate(-1, 0, 0).Format("2006-01-02"))
	if err != nil {
		log.Printf("Warning: failed to create asset: %v", err)
	}

	// Create budget for current month
	currentMonth := time.Now().Format("2006-01")
	_, err = DB.Exec(ctx, `
		INSERT INTO budgets (entity_id, month, category_budgets, total_planned)
		VALUES ($1, $2, $3, 3500.00)
	`, personalEntityID, currentMonth, `[
		{"category_id": "`+categoryIDs["Groceries"].String()+`", "planned_amount": 600},
		{"category_id": "`+categoryIDs["Utilities"].String()+`", "planned_amount": 300},
		{"category_id": "`+categoryIDs["Transportation"].String()+`", "planned_amount": 200},
		{"category_id": "`+categoryIDs["Entertainment"].String()+`", "planned_amount": 100},
		{"category_id": "`+categoryIDs["Dining Out"].String()+`", "planned_amount": 250},
		{"category_id": "`+categoryIDs["Healthcare"].String()+`", "planned_amount": 150}
	]`)
	if err != nil {
		log.Printf("Warning: failed to create budget: %v", err)
	}

	log.Println("✅ Database seeding completed!")
	log.Println("\n🔑 Test Credentials:")
	log.Println("   Admin: username=admin, password=admin123")
	log.Println("   User:  username=testuser, password=user123")

	return nil
}
