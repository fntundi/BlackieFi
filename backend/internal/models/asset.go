package models

import (
	"time"

	"github.com/google/uuid"
)

type Asset struct {
	ID                  uuid.UUID `json:"id"`
	EntityID            uuid.UUID `json:"entity_id"`
	Name                string    `json:"name"`
	Type                string    `json:"type"` // property, vehicle, equipment, furniture, technology, intellectual_property, other
	Description         string    `json:"description"`
	PurchaseDate        *string   `json:"purchase_date"`
	PurchasePrice       *float64  `json:"purchase_price"`
	CurrentValue        *float64  `json:"current_value"`
	DepreciationMethod  string    `json:"depreciation_method"` // straight_line, declining_balance, none
	UsefulLifeYears     *int      `json:"useful_life_years"`
	SalvageValue        *float64  `json:"salvage_value"`
	Location            string    `json:"location"`
	SerialNumber        string    `json:"serial_number"`
	Vendor              string    `json:"vendor"`
	WarrantyExpiration  *string   `json:"warranty_expiration"`
	MaintenanceSchedule string    `json:"maintenance_schedule"`
	IsActive            bool      `json:"is_active"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type AssetInput struct {
	EntityID            uuid.UUID `json:"entity_id" binding:"required"`
	Name                string    `json:"name" binding:"required"`
	Type                string    `json:"type" binding:"required"`
	Description         string    `json:"description"`
	PurchaseDate        *string   `json:"purchase_date"`
	PurchasePrice       *float64  `json:"purchase_price"`
	CurrentValue        *float64  `json:"current_value"`
	DepreciationMethod  string    `json:"depreciation_method"`
	UsefulLifeYears     *int      `json:"useful_life_years"`
	SalvageValue        *float64  `json:"salvage_value"`
	Location            string    `json:"location"`
	SerialNumber        string    `json:"serial_number"`
	Vendor              string    `json:"vendor"`
	WarrantyExpiration  *string   `json:"warranty_expiration"`
	MaintenanceSchedule string    `json:"maintenance_schedule"`
}
