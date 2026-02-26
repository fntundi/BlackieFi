package models

import (
	"time"

	"github.com/google/uuid"
)

type Debt struct {
	ID               uuid.UUID  `json:"id"`
	EntityID         uuid.UUID  `json:"entity_id"`
	AccountID        *uuid.UUID `json:"account_id"`
	Name             string     `json:"name"`
	Type             string     `json:"type"` // loan, credit_card, line_of_credit, other
	OriginalAmount   float64    `json:"original_amount"`
	CurrentBalance   float64    `json:"current_balance"`
	InterestRate     *float64   `json:"interest_rate"`
	MinimumPayment   *float64   `json:"minimum_payment"`
	PaymentFrequency string     `json:"payment_frequency"`
	NextPaymentDate  *string    `json:"next_payment_date"`
	IsActive         bool       `json:"is_active"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type DebtInput struct {
	EntityID         uuid.UUID  `json:"entity_id" binding:"required"`
	AccountID        *uuid.UUID `json:"account_id"`
	Name             string     `json:"name" binding:"required"`
	Type             string     `json:"type" binding:"required"`
	OriginalAmount   float64    `json:"original_amount" binding:"required"`
	CurrentBalance   float64    `json:"current_balance" binding:"required"`
	InterestRate     *float64   `json:"interest_rate"`
	MinimumPayment   *float64   `json:"minimum_payment"`
	PaymentFrequency string     `json:"payment_frequency"`
	NextPaymentDate  *string    `json:"next_payment_date"`
}
