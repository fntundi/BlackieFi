package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Group struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type GroupInput struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type GroupMember struct {
	ID        uuid.UUID `json:"id"`
	GroupID   uuid.UUID `json:"group_id"`
	UserID    uuid.UUID `json:"user_id"`
	Role      string    `json:"role"` // admin, member
	CreatedAt time.Time `json:"created_at"`
}

type GroupMemberInput struct {
	GroupID uuid.UUID `json:"group_id" binding:"required"`
	UserID  uuid.UUID `json:"user_id" binding:"required"`
	Role    string    `json:"role"`
}

type Permissions struct {
	Read  bool `json:"read"`
	Write bool `json:"write"`
}

type GroupEntityAccess struct {
	ID          uuid.UUID   `json:"id"`
	GroupID     uuid.UUID   `json:"group_id"`
	EntityID    uuid.UUID   `json:"entity_id"`
	Permissions Permissions `json:"permissions"`
	CreatedAt   time.Time   `json:"created_at"`
}

type GroupEntityAccessInput struct {
	GroupID     uuid.UUID   `json:"group_id" binding:"required"`
	EntityID    uuid.UUID   `json:"entity_id" binding:"required"`
	Permissions Permissions `json:"permissions"`
}

func (g *GroupEntityAccess) PermissionsJSON() ([]byte, error) {
	return json.Marshal(g.Permissions)
}

func (g *GroupEntityAccess) SetPermissionsFromJSON(data []byte) error {
	return json.Unmarshal(data, &g.Permissions)
}
