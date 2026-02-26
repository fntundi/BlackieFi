package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                   uuid.UUID  `json:"id"`
	Username             string     `json:"username"`
	Email                string     `json:"email"`
	PasswordHash         string     `json:"-"`
	FullName             string     `json:"full_name"`
	Role                 string     `json:"role"`
	AIEnabled            bool       `json:"ai_enabled"`
	PreferredLLMProvider string     `json:"preferred_llm_provider"`
	PasswordResetToken   *string    `json:"-"`
	PasswordResetExpires *time.Time `json:"-"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

type UserRegisterInput struct {
	Username string `json:"username" binding:"required,min=3,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name"`
}

type UserLoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type PasswordResetRequestInput struct {
	Email string `json:"email" binding:"required,email"`
}

type PasswordResetInput struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

type UserUpdateInput struct {
	FullName             *string `json:"full_name"`
	Email                *string `json:"email"`
	AIEnabled            *bool   `json:"ai_enabled"`
	PreferredLLMProvider *string `json:"preferred_llm_provider"`
}
