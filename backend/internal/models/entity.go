package models

import (
	"time"

	"github.com/google/uuid"
)

type Entity struct {
	ID        uuid.UUID `json:"id"`
	OwnerID   uuid.UUID `json:"owner_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"` // personal, business
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type EntityInput struct {
	Name string `json:"name" binding:"required"`
	Type string `json:"type" binding:"required,oneof=personal business"`
}
