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

type CategoryHandler struct{}

func NewCategoryHandler() *CategoryHandler {
	return &CategoryHandler{}
}

func (h *CategoryHandler) List(c *gin.Context) {
	entityID := c.Query("entity_id")

	query := `
		SELECT id, entity_id, parent_category_id, name, type, auto_categorization_rules, is_default, created_at, updated_at
		FROM categories
	`
	args := []interface{}{}

	if entityID != "" {
		query += " WHERE entity_id = $1 OR entity_id IS NULL"
		args = append(args, entityID)
	}
	query += " ORDER BY name"

	rows, err := database.DB.Query(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}
	defer rows.Close()

	categories := []models.Category{}
	for rows.Next() {
		var cat models.Category
		err := rows.Scan(&cat.ID, &cat.EntityID, &cat.ParentCategoryID, &cat.Name, &cat.Type,
			&cat.AutoCategorizeRules, &cat.IsDefault, &cat.CreatedAt, &cat.UpdatedAt)
		if err != nil {
			continue
		}
		categories = append(categories, cat)
	}

	c.JSON(http.StatusOK, categories)
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var input models.CategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cat models.Category
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO categories (entity_id, parent_category_id, name, type, auto_categorization_rules, is_default)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, entity_id, parent_category_id, name, type, auto_categorization_rules, is_default, created_at, updated_at
	`, input.EntityID, input.ParentCategoryID, input.Name, input.Type, input.AutoCategorizeRules, input.IsDefault).Scan(
		&cat.ID, &cat.EntityID, &cat.ParentCategoryID, &cat.Name, &cat.Type,
		&cat.AutoCategorizeRules, &cat.IsDefault, &cat.CreatedAt, &cat.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}

	c.JSON(http.StatusCreated, cat)
}

func (h *CategoryHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	var cat models.Category
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, entity_id, parent_category_id, name, type, auto_categorization_rules, is_default, created_at, updated_at
		FROM categories WHERE id = $1
	`, id).Scan(&cat.ID, &cat.EntityID, &cat.ParentCategoryID, &cat.Name, &cat.Type,
		&cat.AutoCategorizeRules, &cat.IsDefault, &cat.CreatedAt, &cat.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	c.JSON(http.StatusOK, cat)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	var input models.CategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cat models.Category
	err = database.DB.QueryRow(context.Background(), `
		UPDATE categories 
		SET entity_id = $1, parent_category_id = $2, name = $3, type = $4, 
		    auto_categorization_rules = $5, is_default = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $7
		RETURNING id, entity_id, parent_category_id, name, type, auto_categorization_rules, is_default, created_at, updated_at
	`, input.EntityID, input.ParentCategoryID, input.Name, input.Type,
		input.AutoCategorizeRules, input.IsDefault, id).Scan(
		&cat.ID, &cat.EntityID, &cat.ParentCategoryID, &cat.Name, &cat.Type,
		&cat.AutoCategorizeRules, &cat.IsDefault, &cat.CreatedAt, &cat.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	c.JSON(http.StatusOK, cat)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	_, err = database.DB.Exec(context.Background(), `DELETE FROM categories WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category deleted"})
}

func (h *CategoryHandler) BulkCreate(c *gin.Context) {
	var inputs []models.CategoryInput
	if err := c.ShouldBindJSON(&inputs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	batch := &pgx.Batch{}
	for _, input := range inputs {
		batch.Queue(`
			INSERT INTO categories (entity_id, parent_category_id, name, type, auto_categorization_rules, is_default)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, input.EntityID, input.ParentCategoryID, input.Name, input.Type, input.AutoCategorizeRules, input.IsDefault)
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
