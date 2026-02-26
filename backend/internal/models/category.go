package models

import (
	"time"

	"github.com/google/uuid"
)

type Category struct {
	ID                      uuid.UUID  `json:"id"`
	EntityID                *uuid.UUID `json:"entity_id"`
	ParentCategoryID        *uuid.UUID `json:"parent_category"`
	Name                    string     `json:"name"`
	Type                    string     `json:"type"` // income, expense, both
	AutoCategorizeRules     []string   `json:"auto_categorization_rules"`
	IsDefault               bool       `json:"is_default"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
}

type CategoryInput struct {
	EntityID            *uuid.UUID `json:"entity_id"`
	ParentCategoryID    *uuid.UUID `json:"parent_category"`
	Name                string     `json:"name" binding:"required"`
	Type                string     `json:"type" binding:"required,oneof=income expense both"`
	AutoCategorizeRules []string   `json:"auto_categorization_rules"`
	IsDefault           bool       `json:"is_default"`
}
