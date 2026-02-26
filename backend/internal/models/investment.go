package models

import (
	"time"

	"github.com/google/uuid"
)

type InvestmentVehicle struct {
	ID        uuid.UUID `json:"id"`
	EntityID  uuid.UUID `json:"entity_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"` // 401k, ira, roth_ira, brokerage, crypto, other
	Provider  string    `json:"provider"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type InvestmentVehicleInput struct {
	EntityID uuid.UUID `json:"entity_id" binding:"required"`
	Name     string    `json:"name" binding:"required"`
	Type     string    `json:"type" binding:"required"`
	Provider string    `json:"provider"`
}

type InvestmentHolding struct {
	ID              uuid.UUID `json:"id"`
	VehicleID       uuid.UUID `json:"vehicle_id"`
	AssetName       string    `json:"asset_name"`
	AssetClass      string    `json:"asset_class"` // stocks, bonds, real_estate, crypto, commodities, cash
	Quantity        float64   `json:"quantity"`
	CostBasis       float64   `json:"cost_basis"`
	CurrentPrice    *float64  `json:"current_price"`
	BenchmarkSymbol *string   `json:"benchmark_symbol"`
	LastUpdated     *string   `json:"last_updated"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type InvestmentHoldingInput struct {
	VehicleID       uuid.UUID `json:"vehicle_id" binding:"required"`
	AssetName       string    `json:"asset_name" binding:"required"`
	AssetClass      string    `json:"asset_class" binding:"required"`
	Quantity        float64   `json:"quantity" binding:"required"`
	CostBasis       float64   `json:"cost_basis" binding:"required"`
	CurrentPrice    *float64  `json:"current_price"`
	BenchmarkSymbol *string   `json:"benchmark_symbol"`
}
