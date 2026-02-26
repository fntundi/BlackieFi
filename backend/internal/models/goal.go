package models

import (
	"time"

	"github.com/google/uuid"
)

type FinancialGoal struct {
	ID                  uuid.UUID `json:"id"`
	EntityID            uuid.UUID `json:"entity_id"`
	Name                string    `json:"name"`
	GoalType            string    `json:"goal_type"` // savings, debt_payoff, investment, retirement, emergency_fund, other
	TargetAmount        float64   `json:"target_amount"`
	CurrentAmount       float64   `json:"current_amount"`
	Deadline            *string   `json:"deadline"`
	MonthlyContribution float64   `json:"monthly_contribution"`
	Priority            string    `json:"priority"` // low, medium, high
	Status              string    `json:"status"`   // active, paused, completed
	Notes               string    `json:"notes"`
	AIRecommendations   []string  `json:"ai_recommendations"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type FinancialGoalInput struct {
	EntityID            uuid.UUID `json:"entity_id" binding:"required"`
	Name                string    `json:"name" binding:"required"`
	GoalType            string    `json:"goal_type" binding:"required"`
	TargetAmount        float64   `json:"target_amount" binding:"required"`
	CurrentAmount       float64   `json:"current_amount"`
	Deadline            *string   `json:"deadline"`
	MonthlyContribution float64   `json:"monthly_contribution"`
	Priority            string    `json:"priority"`
	Notes               string    `json:"notes"`
}
