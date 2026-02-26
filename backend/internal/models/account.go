package models

import (
	"time"

	"github.com/google/uuid"
)

type Account struct {
	ID        uuid.UUID `json:"id"`
	EntityID  uuid.UUID `json:"entity_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"` // checking, savings, credit_card, cash
	Balance   float64   `json:"balance"`
	Currency  string    `json:"currency"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AccountInput struct {
	EntityID uuid.UUID `json:"entity_id" binding:"required"`
	Name     string    `json:"name" binding:"required"`
	Type     string    `json:"type" binding:"required"`
	Balance  float64   `json:"balance"`
	Currency string    `json:"currency"`
}
