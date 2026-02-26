package handlers

import (
	"context"
	"net/http"

	"github.com/blackiefi/backend/internal/database"
	"github.com/blackiefi/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type TransactionHandler struct{}

func NewTransactionHandler() *TransactionHandler {
	return &TransactionHandler{}
}

func (h *TransactionHandler) List(c *gin.Context) {
	var filter models.TransactionFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if filter.Limit == 0 {
		filter.Limit = 100
	}

	query := `
		SELECT id, entity_id, account_id, category_id, type, amount, date, description, 
		       linked_asset_id, linked_inventory_id, ai_tags, created_at, updated_at
		FROM transactions WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if filter.EntityID != nil {
		query += " AND entity_id = $" + itoa(argIndex)
		args = append(args, *filter.EntityID)
		argIndex++
	}
	if filter.CategoryID != nil {
		query += " AND category_id = $" + itoa(argIndex)
		args = append(args, *filter.CategoryID)
		argIndex++
	}
	if filter.Type != nil {
		query += " AND type = $" + itoa(argIndex)
		args = append(args, *filter.Type)
		argIndex++
	}
	if filter.StartDate != nil {
		query += " AND date >= $" + itoa(argIndex)
		args = append(args, *filter.StartDate)
		argIndex++
	}
	if filter.EndDate != nil {
		query += " AND date <= $" + itoa(argIndex)
		args = append(args, *filter.EndDate)
		argIndex++
	}
	if filter.MinAmount != nil {
		query += " AND amount >= $" + itoa(argIndex)
		args = append(args, *filter.MinAmount)
		argIndex++
	}
	if filter.MaxAmount != nil {
		query += " AND amount <= $" + itoa(argIndex)
		args = append(args, *filter.MaxAmount)
		argIndex++
	}

	query += " ORDER BY date DESC LIMIT $" + itoa(argIndex)
	args = append(args, filter.Limit)

	rows, err := database.DB.Query(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}
	defer rows.Close()

	transactions := []models.Transaction{}
	for rows.Next() {
		var t models.Transaction
		err := rows.Scan(&t.ID, &t.EntityID, &t.AccountID, &t.CategoryID, &t.Type, &t.Amount,
			&t.Date, &t.Description, &t.LinkedAssetID, &t.LinkedInventoryID, &t.AITags,
			&t.CreatedAt, &t.UpdatedAt)
		if err != nil {
			continue
		}
		transactions = append(transactions, t)
	}

	c.JSON(http.StatusOK, transactions)
}

func (h *TransactionHandler) Create(c *gin.Context) {
	var input models.TransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var t models.Transaction
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO transactions (entity_id, account_id, category_id, type, amount, date, description, linked_asset_id, linked_inventory_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, entity_id, account_id, category_id, type, amount, date, description, 
		          linked_asset_id, linked_inventory_id, ai_tags, created_at, updated_at
	`, input.EntityID, input.AccountID, input.CategoryID, input.Type, input.Amount,
		input.Date, input.Description, input.LinkedAssetID, input.LinkedInventoryID).Scan(
		&t.ID, &t.EntityID, &t.AccountID, &t.CategoryID, &t.Type, &t.Amount,
		&t.Date, &t.Description, &t.LinkedAssetID, &t.LinkedInventoryID, &t.AITags,
		&t.CreatedAt, &t.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

	c.JSON(http.StatusCreated, t)
}

func (h *TransactionHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	var t models.Transaction
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, entity_id, account_id, category_id, type, amount, date, description,
		       linked_asset_id, linked_inventory_id, ai_tags, created_at, updated_at
		FROM transactions WHERE id = $1
	`, id).Scan(&t.ID, &t.EntityID, &t.AccountID, &t.CategoryID, &t.Type, &t.Amount,
		&t.Date, &t.Description, &t.LinkedAssetID, &t.LinkedInventoryID, &t.AITags,
		&t.CreatedAt, &t.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	c.JSON(http.StatusOK, t)
}

func (h *TransactionHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	var input models.TransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var t models.Transaction
	err = database.DB.QueryRow(context.Background(), `
		UPDATE transactions 
		SET entity_id = $1, account_id = $2, category_id = $3, type = $4, amount = $5,
		    date = $6, description = $7, linked_asset_id = $8, linked_inventory_id = $9, updated_at = CURRENT_TIMESTAMP
		WHERE id = $10
		RETURNING id, entity_id, account_id, category_id, type, amount, date, description,
		          linked_asset_id, linked_inventory_id, ai_tags, created_at, updated_at
	`, input.EntityID, input.AccountID, input.CategoryID, input.Type, input.Amount,
		input.Date, input.Description, input.LinkedAssetID, input.LinkedInventoryID, id).Scan(
		&t.ID, &t.EntityID, &t.AccountID, &t.CategoryID, &t.Type, &t.Amount,
		&t.Date, &t.Description, &t.LinkedAssetID, &t.LinkedInventoryID, &t.AITags,
		&t.CreatedAt, &t.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	c.JSON(http.StatusOK, t)
}

func (h *TransactionHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}

	_, err = database.DB.Exec(context.Background(), `DELETE FROM transactions WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaction deleted"})
}

func (h *TransactionHandler) BulkCreate(c *gin.Context) {
	var inputs []models.TransactionInput
	if err := c.ShouldBindJSON(&inputs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	batch := &pgx.Batch{}
	for _, input := range inputs {
		batch.Queue(`
			INSERT INTO transactions (entity_id, account_id, category_id, type, amount, date, description)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, input.EntityID, input.AccountID, input.CategoryID, input.Type, input.Amount, input.Date, input.Description)
	}

	results := database.DB.SendBatch(context.Background(), batch)
	defer results.Close()

	created := 0
	for range inputs {
		_, err := results.Exec()
		if err == nil {
			created++
		}
	}

	c.JSON(http.StatusCreated, gin.H{"created": created})
}

func itoa(n int) string {
	return string(rune('0' + n))
}
