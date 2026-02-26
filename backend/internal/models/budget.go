package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type CategoryBudget struct {
	CategoryID    uuid.UUID `json:"category_id"`
	PlannedAmount float64   `json:"planned_amount"`
	Reasoning     string    `json:"reasoning,omitempty"`
	Priority      string    `json:"priority,omitempty"`
}

type Budget struct {
	ID              uuid.UUID        `json:"id"`
	EntityID        uuid.UUID        `json:"entity_id"`
	Month           string           `json:"month"` // YYYY-MM format
	CategoryBudgets []CategoryBudget `json:"category_budgets"`
	TotalPlanned    float64          `json:"total_planned"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

type BudgetInput struct {
	EntityID        uuid.UUID        `json:"entity_id" binding:"required"`
	Month           string           `json:"month" binding:"required"`
	CategoryBudgets []CategoryBudget `json:"category_budgets"`
	TotalPlanned    float64          `json:"total_planned"`
}

// Helper methods for JSON serialization
func (b *Budget) CategoryBudgetsJSON() ([]byte, error) {
	return json.Marshal(b.CategoryBudgets)
}

func (b *Budget) SetCategoryBudgetsFromJSON(data []byte) error {
	return json.Unmarshal(data, &b.CategoryBudgets)
}
