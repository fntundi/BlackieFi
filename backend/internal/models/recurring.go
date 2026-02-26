package models

import (
	"time"

	"github.com/google/uuid"
)

type RecurringTransaction struct {
	ID         uuid.UUID  `json:"id"`
	EntityID   uuid.UUID  `json:"entity_id"`
	AccountID  *uuid.UUID `json:"account_id"`
	CategoryID *uuid.UUID `json:"category_id"`
	Name       string     `json:"name"`
	Type       string     `json:"type"` // income, expense
	Amount     float64    `json:"amount"`
	Frequency  string     `json:"frequency"` // weekly, biweekly, monthly, quarterly, yearly
	NextDate   string     `json:"next_date"`
	IsActive   bool       `json:"is_active"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type RecurringTransactionInput struct {
	EntityID   uuid.UUID  `json:"entity_id" binding:"required"`
	AccountID  *uuid.UUID `json:"account_id"`
	CategoryID *uuid.UUID `json:"category_id"`
	Name       string     `json:"name" binding:"required"`
	Type       string     `json:"type" binding:"required,oneof=income expense"`
	Amount     float64    `json:"amount" binding:"required"`
	Frequency  string     `json:"frequency" binding:"required"`
	NextDate   string     `json:"next_date" binding:"required"`
}
