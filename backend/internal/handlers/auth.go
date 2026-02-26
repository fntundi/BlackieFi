package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/blackiefi/backend/internal/database"
	"github.com/blackiefi/backend/internal/models"
	"github.com/blackiefi/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input models.UserRegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	var user models.User
	err = database.DB.QueryRow(context.Background(), `
		INSERT INTO users (username, email, password_hash, full_name, role)
		VALUES ($1, $2, $3, $4, 'user')
		RETURNING id, username, email, full_name, role, ai_enabled, preferred_llm_provider, created_at, updated_at
	`, input.Username, input.Email, hashedPassword, input.FullName).Scan(
		&user.ID, &user.Username, &user.Email, &user.FullName, &user.Role,
		&user.AIEnabled, &user.PreferredLLMProvider, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		if err.Error() == `ERROR: duplicate key value violates unique constraint "users_username_key" (SQLSTATE 23505)` {
			c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
			return
		}
		if err.Error() == `ERROR: duplicate key value violates unique constraint "users_email_key" (SQLSTATE 23505)` {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"user":  user,
		"token": token,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input models.UserLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	err := database.DB.QueryRow(context.Background(), `
		SELECT id, username, email, password_hash, full_name, role, ai_enabled, preferred_llm_provider, created_at, updated_at
		FROM users WHERE username = $1
	`, input.Username).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.FullName,
		&user.Role, &user.AIEnabled, &user.PreferredLLMProvider, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if !utils.CheckPassword(input.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":  user,
		"token": token,
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	err := database.DB.QueryRow(context.Background(), `
		SELECT id, username, email, full_name, role, ai_enabled, preferred_llm_provider, created_at, updated_at
		FROM users WHERE id = $1
	`, userID).Scan(
		&user.ID, &user.Username, &user.Email, &user.FullName, &user.Role,
		&user.AIEnabled, &user.PreferredLLMProvider, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) RequestPasswordReset(c *gin.Context) {
	var input models.PasswordResetRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resetToken, _ := utils.GenerateResetToken()
	expires := time.Now().Add(1 * time.Hour)

	_, err := database.DB.Exec(context.Background(), `
		UPDATE users SET password_reset_token = $1, password_reset_expires = $2
		WHERE email = $3
	`, resetToken, expires, input.Email)

	if err != nil {
		// Don't reveal if email exists
		c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a reset link has been sent"})
		return
	}

	// In production, send email here
	// For now, return token for testing
	c.JSON(http.StatusOK, gin.H{
		"message":     "Password reset token generated",
		"reset_token": resetToken, // Remove in production
	})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var input models.PasswordResetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPassword, err := utils.HashPassword(input.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	result, err := database.DB.Exec(context.Background(), `
		UPDATE users 
		SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP
		WHERE password_reset_token = $2 AND password_reset_expires > CURRENT_TIMESTAMP
	`, hashedPassword, input.Token)

	if err != nil || result.RowsAffected() == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var input models.UserUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build dynamic update query
	query := "UPDATE users SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{}
	argIndex := 1

	if input.FullName != nil {
		query += ", full_name = $" + strconv.Itoa(argIndex)
		args = append(args, *input.FullName)
		argIndex++
	}
	if input.Email != nil {
		query += ", email = $" + strconv.Itoa(argIndex)
		args = append(args, *input.Email)
		argIndex++
	}
	if input.AIEnabled != nil {
		query += ", ai_enabled = $" + strconv.Itoa(argIndex)
		args = append(args, *input.AIEnabled)
		argIndex++
	}
	if input.PreferredLLMProvider != nil {
		query += ", preferred_llm_provider = $" + strconv.Itoa(argIndex)
		args = append(args, *input.PreferredLLMProvider)
		argIndex++
	}

	query += " WHERE id = $" + strconv.Itoa(argIndex)
	args = append(args, userID)

	_, err := database.DB.Exec(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	// Return updated user
	var user models.User
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, username, email, full_name, role, ai_enabled, preferred_llm_provider, created_at, updated_at
		FROM users WHERE id = $1
	`, userID).Scan(
		&user.ID, &user.Username, &user.Email, &user.FullName, &user.Role,
		&user.AIEnabled, &user.PreferredLLMProvider, &user.CreatedAt, &user.UpdatedAt,
	)

	c.JSON(http.StatusOK, user)
}

// GetUserID helper to get user ID from context
func GetUserID(c *gin.Context) uuid.UUID {
	userID, _ := c.Get("user_id")
	return userID.(uuid.UUID)
}
