package models

import (
	"time"

	"github.com/google/uuid"
)

type Transaction struct {
	ID                uuid.UUID  `json:"id"`
	EntityID          uuid.UUID  `json:"entity_id"`
	AccountID         *uuid.UUID `json:"account_id"`
	CategoryID        *uuid.UUID `json:"category_id"`
	Type              string     `json:"type"` // income, expense, transfer
	Amount            float64    `json:"amount"`
	Date              string     `json:"date"`
	Description       string     `json:"description"`
	LinkedAssetID     *uuid.UUID `json:"linked_asset_id"`
	LinkedInventoryID *uuid.UUID `json:"linked_inventory_id"`
	AITags            []string   `json:"ai_tags"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type TransactionInput struct {
	EntityID          uuid.UUID  `json:"entity_id" binding:"required"`
	AccountID         *uuid.UUID `json:"account_id"`
	CategoryID        *uuid.UUID `json:"category_id"`
	Type              string     `json:"type" binding:"required,oneof=income expense transfer"`
	Amount            float64    `json:"amount" binding:"required"`
	Date              string     `json:"date" binding:"required"`
	Description       string     `json:"description"`
	LinkedAssetID     *uuid.UUID `json:"linked_asset_id"`
	LinkedInventoryID *uuid.UUID `json:"linked_inventory_id"`
}

type TransactionFilter struct {
	EntityID   *uuid.UUID `form:"entity_id"`
	CategoryID *uuid.UUID `form:"category_id"`
	Type       *string    `form:"type"`
	StartDate  *string    `form:"start_date"`
	EndDate    *string    `form:"end_date"`
	MinAmount  *float64   `form:"min_amount"`
	MaxAmount  *float64   `form:"max_amount"`
	Limit      int        `form:"limit"`
}
