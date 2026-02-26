package models

import (
	"time"

	"github.com/google/uuid"
)

type CategorizationLearning struct {
	ID                     uuid.UUID  `json:"id"`
	EntityID               uuid.UUID  `json:"entity_id"`
	TransactionDescription string     `json:"transaction_description"`
	TransactionAmount      float64    `json:"transaction_amount"`
	SuggestedCategoryID    *uuid.UUID `json:"suggested_category_id"`
	ActualCategoryID       *uuid.UUID `json:"actual_category_id"`
	WasCorrection          bool       `json:"was_correction"`
	CorrectionCount        int        `json:"correction_count"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}
