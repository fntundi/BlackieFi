package handlers

import (
	"context"
	"net/http"

	"github.com/blackiefi/backend/internal/database"
	"github.com/blackiefi/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RecurringHandler struct{}

func NewRecurringHandler() *RecurringHandler {
	return &RecurringHandler{}
}

func (h *RecurringHandler) List(c *gin.Context) {
	entityID := c.Query("entity_id")
	isActive := c.DefaultQuery("is_active", "true")

	query := `
		SELECT id, entity_id, account_id, category_id, name, type, amount, frequency, next_date,
		       is_active, created_at, updated_at
		FROM recurring_transactions WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if entityID != "" {
		query += " AND entity_id = $" + itoa(argIndex)
		args = append(args, entityID)
		argIndex++
	}
	if isActive == "true" {
		query += " AND is_active = true"
	}
	query += " ORDER BY next_date"

	rows, err := database.DB.Query(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recurring transactions"})
		return
	}
	defer rows.Close()

	recurring := []models.RecurringTransaction{}
	for rows.Next() {
		var r models.RecurringTransaction
		err := rows.Scan(&r.ID, &r.EntityID, &r.AccountID, &r.CategoryID, &r.Name, &r.Type,
			&r.Amount, &r.Frequency, &r.NextDate, &r.IsActive, &r.CreatedAt, &r.UpdatedAt)
		if err != nil {
			continue
		}
		recurring = append(recurring, r)
	}

	c.JSON(http.StatusOK, recurring)
}

func (h *RecurringHandler) Create(c *gin.Context) {
	var input models.RecurringTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var r models.RecurringTransaction
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO recurring_transactions (entity_id, account_id, category_id, name, type, amount, frequency, next_date, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
		RETURNING id, entity_id, account_id, category_id, name, type, amount, frequency, next_date,
		          is_active, created_at, updated_at
	`, input.EntityID, input.AccountID, input.CategoryID, input.Name, input.Type,
		input.Amount, input.Frequency, input.NextDate).Scan(
		&r.ID, &r.EntityID, &r.AccountID, &r.CategoryID, &r.Name, &r.Type, &r.Amount,
		&r.Frequency, &r.NextDate, &r.IsActive, &r.CreatedAt, &r.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create recurring transaction"})
		return
	}

	c.JSON(http.StatusCreated, r)
}

func (h *RecurringHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid recurring transaction ID"})
		return
	}

	var r models.RecurringTransaction
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, entity_id, account_id, category_id, name, type, amount, frequency, next_date,
		       is_active, created_at, updated_at
		FROM recurring_transactions WHERE id = $1
	`, id).Scan(&r.ID, &r.EntityID, &r.AccountID, &r.CategoryID, &r.Name, &r.Type,
		&r.Amount, &r.Frequency, &r.NextDate, &r.IsActive, &r.CreatedAt, &r.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Recurring transaction not found"})
		return
	}

	c.JSON(http.StatusOK, r)
}

func (h *RecurringHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid recurring transaction ID"})
		return
	}

	var input models.RecurringTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var r models.RecurringTransaction
	err = database.DB.QueryRow(context.Background(), `
		UPDATE recurring_transactions 
		SET account_id = $1, category_id = $2, name = $3, type = $4, amount = $5, frequency = $6,
		    next_date = $7, updated_at = CURRENT_TIMESTAMP
		WHERE id = $8
		RETURNING id, entity_id, account_id, category_id, name, type, amount, frequency, next_date,
		          is_active, created_at, updated_at
	`, input.AccountID, input.CategoryID, input.Name, input.Type, input.Amount,
		input.Frequency, input.NextDate, id).Scan(
		&r.ID, &r.EntityID, &r.AccountID, &r.CategoryID, &r.Name, &r.Type, &r.Amount,
		&r.Frequency, &r.NextDate, &r.IsActive, &r.CreatedAt, &r.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Recurring transaction not found"})
		return
	}

	c.JSON(http.StatusOK, r)
}

func (h *RecurringHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid recurring transaction ID"})
		return
	}

	_, err = database.DB.Exec(context.Background(), `UPDATE recurring_transactions SET is_active = false WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete recurring transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Recurring transaction deleted"})
}
