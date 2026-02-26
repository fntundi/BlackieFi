package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/blackiefi/backend/internal/database"
	"github.com/blackiefi/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AccountHandler struct{}

func NewAccountHandler() *AccountHandler {
	return &AccountHandler{}
}

func (h *AccountHandler) List(c *gin.Context) {
	entityID := c.Query("entity_id")
	isActive := c.DefaultQuery("is_active", "true")

	query := `
		SELECT id, entity_id, name, type, balance, currency, is_active, created_at, updated_at
		FROM accounts WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if entityID != "" {
		query += " AND entity_id = $" + strconv.Itoa(argIndex)
		args = append(args, entityID)
		argIndex++
	}
	if isActive == "true" {
		query += " AND is_active = true"
	}
	query += " ORDER BY name"

	rows, err := database.DB.Query(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch accounts"})
		return
	}
	defer rows.Close()

	accounts := []models.Account{}
	for rows.Next() {
		var a models.Account
		err := rows.Scan(&a.ID, &a.EntityID, &a.Name, &a.Type, &a.Balance, &a.Currency, &a.IsActive, &a.CreatedAt, &a.UpdatedAt)
		if err != nil {
			continue
		}
		accounts = append(accounts, a)
	}

	c.JSON(http.StatusOK, accounts)
}

func (h *AccountHandler) Create(c *gin.Context) {
	var input models.AccountInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	currency := input.Currency
	if currency == "" {
		currency = "USD"
	}

	var a models.Account
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO accounts (entity_id, name, type, balance, currency, is_active)
		VALUES ($1, $2, $3, $4, $5, true)
		RETURNING id, entity_id, name, type, balance, currency, is_active, created_at, updated_at
	`, input.EntityID, input.Name, input.Type, input.Balance, currency).Scan(
		&a.ID, &a.EntityID, &a.Name, &a.Type, &a.Balance, &a.Currency, &a.IsActive, &a.CreatedAt, &a.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	c.JSON(http.StatusCreated, a)
}

func (h *AccountHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	var a models.Account
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, entity_id, name, type, balance, currency, is_active, created_at, updated_at
		FROM accounts WHERE id = $1
	`, id).Scan(&a.ID, &a.EntityID, &a.Name, &a.Type, &a.Balance, &a.Currency, &a.IsActive, &a.CreatedAt, &a.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}

	c.JSON(http.StatusOK, a)
}

func (h *AccountHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	var input models.AccountInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var a models.Account
	err = database.DB.QueryRow(context.Background(), `
		UPDATE accounts SET name = $1, type = $2, balance = $3, currency = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
		RETURNING id, entity_id, name, type, balance, currency, is_active, created_at, updated_at
	`, input.Name, input.Type, input.Balance, input.Currency, id).Scan(
		&a.ID, &a.EntityID, &a.Name, &a.Type, &a.Balance, &a.Currency, &a.IsActive, &a.CreatedAt, &a.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}

	c.JSON(http.StatusOK, a)
}

func (h *AccountHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	// Soft delete
	_, err = database.DB.Exec(context.Background(), `UPDATE accounts SET is_active = false WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Account deleted"})
}
