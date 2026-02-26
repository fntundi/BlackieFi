package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/blackiefi/backend/internal/database"
	"github.com/blackiefi/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BudgetHandler struct{}

func NewBudgetHandler() *BudgetHandler {
	return &BudgetHandler{}
}

func (h *BudgetHandler) List(c *gin.Context) {
	entityID := c.Query("entity_id")
	month := c.Query("month")

	query := `
		SELECT id, entity_id, month, category_budgets, total_planned, created_at, updated_at
		FROM budgets WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if entityID != "" {
		query += " AND entity_id = $" + strconv.Itoa(argIndex)
		args = append(args, entityID)
		argIndex++
	}
	if month != "" {
		query += " AND month = $" + strconv.Itoa(argIndex)
		args = append(args, month)
	}
	query += " ORDER BY month DESC"

	rows, err := database.DB.Query(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch budgets"})
		return
	}
	defer rows.Close()

	budgets := []models.Budget{}
	for rows.Next() {
		var b models.Budget
		var categoryBudgetsJSON []byte
		err := rows.Scan(&b.ID, &b.EntityID, &b.Month, &categoryBudgetsJSON, &b.TotalPlanned, &b.CreatedAt, &b.UpdatedAt)
		if err != nil {
			continue
		}
		json.Unmarshal(categoryBudgetsJSON, &b.CategoryBudgets)
		budgets = append(budgets, b)
	}

	c.JSON(http.StatusOK, budgets)
}

func (h *BudgetHandler) Create(c *gin.Context) {
	var input models.BudgetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	categoryBudgetsJSON, _ := json.Marshal(input.CategoryBudgets)

	var b models.Budget
	var categoryBudgetsResult []byte
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO budgets (entity_id, month, category_budgets, total_planned)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (entity_id, month) DO UPDATE SET
			category_budgets = EXCLUDED.category_budgets,
			total_planned = EXCLUDED.total_planned,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id, entity_id, month, category_budgets, total_planned, created_at, updated_at
	`, input.EntityID, input.Month, categoryBudgetsJSON, input.TotalPlanned).Scan(
		&b.ID, &b.EntityID, &b.Month, &categoryBudgetsResult, &b.TotalPlanned, &b.CreatedAt, &b.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create budget"})
		return
	}

	json.Unmarshal(categoryBudgetsResult, &b.CategoryBudgets)
	c.JSON(http.StatusCreated, b)
}

func (h *BudgetHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid budget ID"})
		return
	}

	var b models.Budget
	var categoryBudgetsJSON []byte
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, entity_id, month, category_budgets, total_planned, created_at, updated_at
		FROM budgets WHERE id = $1
	`, id).Scan(&b.ID, &b.EntityID, &b.Month, &categoryBudgetsJSON, &b.TotalPlanned, &b.CreatedAt, &b.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Budget not found"})
		return
	}

	json.Unmarshal(categoryBudgetsJSON, &b.CategoryBudgets)
	c.JSON(http.StatusOK, b)
}

func (h *BudgetHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid budget ID"})
		return
	}

	var input models.BudgetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	categoryBudgetsJSON, _ := json.Marshal(input.CategoryBudgets)

	var b models.Budget
	var categoryBudgetsResult []byte
	err = database.DB.QueryRow(context.Background(), `
		UPDATE budgets 
		SET category_budgets = $1, total_planned = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
		RETURNING id, entity_id, month, category_budgets, total_planned, created_at, updated_at
	`, categoryBudgetsJSON, input.TotalPlanned, id).Scan(
		&b.ID, &b.EntityID, &b.Month, &categoryBudgetsResult, &b.TotalPlanned, &b.CreatedAt, &b.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Budget not found"})
		return
	}

	json.Unmarshal(categoryBudgetsResult, &b.CategoryBudgets)
	c.JSON(http.StatusOK, b)
}

func (h *BudgetHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid budget ID"})
		return
	}

	_, err = database.DB.Exec(context.Background(), `DELETE FROM budgets WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete budget"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Budget deleted"})
}
