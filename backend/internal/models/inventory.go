package models

import (
	"time"

	"github.com/google/uuid"
)

type Inventory struct {
	ID           uuid.UUID `json:"id"`
	EntityID     uuid.UUID `json:"entity_id"`
	Name         string    `json:"name"`
	SKU          string    `json:"sku"`
	Quantity     int       `json:"quantity"`
	UnitCost     *float64  `json:"unit_cost"`
	SellingPrice *float64  `json:"selling_price"`
	ReorderPoint int       `json:"reorder_point"`
	Category     string    `json:"category"`
	Location     string    `json:"location"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type InventoryInput struct {
	EntityID     uuid.UUID `json:"entity_id" binding:"required"`
	Name         string    `json:"name" binding:"required"`
	SKU          string    `json:"sku"`
	Quantity     int       `json:"quantity"`
	UnitCost     *float64  `json:"unit_cost"`
	SellingPrice *float64  `json:"selling_price"`
	ReorderPoint int       `json:"reorder_point"`
	Category     string    `json:"category"`
	Location     string    `json:"location"`
}
