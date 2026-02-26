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

type DebtHandler struct{}

func NewDebtHandler() *DebtHandler {
	return &DebtHandler{}
}

func (h *DebtHandler) List(c *gin.Context) {
	entityID := c.Query("entity_id")
	isActive := c.DefaultQuery("is_active", "true")

	query := `
		SELECT id, entity_id, account_id, name, type, original_amount, current_balance,
		       interest_rate, minimum_payment, payment_frequency, next_payment_date, is_active,
		       created_at, updated_at
		FROM debts WHERE 1=1
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
	query += " ORDER BY current_balance DESC"

	rows, err := database.DB.Query(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch debts"})
		return
	}
	defer rows.Close()

	debts := []models.Debt{}
	for rows.Next() {
		var d models.Debt
		err := rows.Scan(&d.ID, &d.EntityID, &d.AccountID, &d.Name, &d.Type, &d.OriginalAmount,
			&d.CurrentBalance, &d.InterestRate, &d.MinimumPayment, &d.PaymentFrequency,
			&d.NextPaymentDate, &d.IsActive, &d.CreatedAt, &d.UpdatedAt)
		if err != nil {
			continue
		}
		debts = append(debts, d)
	}

	c.JSON(http.StatusOK, debts)
}

func (h *DebtHandler) Create(c *gin.Context) {
	var input models.DebtInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var d models.Debt
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO debts (entity_id, account_id, name, type, original_amount, current_balance,
		                   interest_rate, minimum_payment, payment_frequency, next_payment_date, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
		RETURNING id, entity_id, account_id, name, type, original_amount, current_balance,
		          interest_rate, minimum_payment, payment_frequency, next_payment_date, is_active,
		          created_at, updated_at
	`, input.EntityID, input.AccountID, input.Name, input.Type, input.OriginalAmount,
		input.CurrentBalance, input.InterestRate, input.MinimumPayment, input.PaymentFrequency,
		input.NextPaymentDate).Scan(
		&d.ID, &d.EntityID, &d.AccountID, &d.Name, &d.Type, &d.OriginalAmount, &d.CurrentBalance,
		&d.InterestRate, &d.MinimumPayment, &d.PaymentFrequency, &d.NextPaymentDate, &d.IsActive,
		&d.CreatedAt, &d.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create debt"})
		return
	}

	c.JSON(http.StatusCreated, d)
}

func (h *DebtHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid debt ID"})
		return
	}

	var d models.Debt
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, entity_id, account_id, name, type, original_amount, current_balance,
		       interest_rate, minimum_payment, payment_frequency, next_payment_date, is_active,
		       created_at, updated_at
		FROM debts WHERE id = $1
	`, id).Scan(&d.ID, &d.EntityID, &d.AccountID, &d.Name, &d.Type, &d.OriginalAmount,
		&d.CurrentBalance, &d.InterestRate, &d.MinimumPayment, &d.PaymentFrequency,
		&d.NextPaymentDate, &d.IsActive, &d.CreatedAt, &d.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Debt not found"})
		return
	}

	c.JSON(http.StatusOK, d)
}

func (h *DebtHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid debt ID"})
		return
	}

	var input models.DebtInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var d models.Debt
	err = database.DB.QueryRow(context.Background(), `
		UPDATE debts 
		SET name = $1, type = $2, original_amount = $3, current_balance = $4,
		    interest_rate = $5, minimum_payment = $6, payment_frequency = $7,
		    next_payment_date = $8, updated_at = CURRENT_TIMESTAMP
		WHERE id = $9
		RETURNING id, entity_id, account_id, name, type, original_amount, current_balance,
		          interest_rate, minimum_payment, payment_frequency, next_payment_date, is_active,
		          created_at, updated_at
	`, input.Name, input.Type, input.OriginalAmount, input.CurrentBalance,
		input.InterestRate, input.MinimumPayment, input.PaymentFrequency,
		input.NextPaymentDate, id).Scan(
		&d.ID, &d.EntityID, &d.AccountID, &d.Name, &d.Type, &d.OriginalAmount, &d.CurrentBalance,
		&d.InterestRate, &d.MinimumPayment, &d.PaymentFrequency, &d.NextPaymentDate, &d.IsActive,
		&d.CreatedAt, &d.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Debt not found"})
		return
	}

	c.JSON(http.StatusOK, d)
}

func (h *DebtHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid debt ID"})
		return
	}

	// Soft delete
	_, err = database.DB.Exec(context.Background(), `UPDATE debts SET is_active = false WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete debt"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Debt deleted"})
}
