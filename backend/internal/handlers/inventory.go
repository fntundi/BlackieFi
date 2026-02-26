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

type InventoryHandler struct{}

func NewInventoryHandler() *InventoryHandler {
	return &InventoryHandler{}
}

func (h *InventoryHandler) List(c *gin.Context) {
	entityID := c.Query("entity_id")
	isActive := c.DefaultQuery("is_active", "true")

	query := `
		SELECT id, entity_id, name, sku, quantity, unit_cost, selling_price, reorder_point,
		       category, location, is_active, created_at, updated_at
		FROM inventory WHERE 1=1
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch inventory"})
		return
	}
	defer rows.Close()

	items := []models.Inventory{}
	for rows.Next() {
		var i models.Inventory
		err := rows.Scan(&i.ID, &i.EntityID, &i.Name, &i.SKU, &i.Quantity, &i.UnitCost,
			&i.SellingPrice, &i.ReorderPoint, &i.Category, &i.Location, &i.IsActive,
			&i.CreatedAt, &i.UpdatedAt)
		if err != nil {
			continue
		}
		items = append(items, i)
	}

	c.JSON(http.StatusOK, items)
}

func (h *InventoryHandler) Create(c *gin.Context) {
	var input models.InventoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var i models.Inventory
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO inventory (entity_id, name, sku, quantity, unit_cost, selling_price, reorder_point, category, location, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
		RETURNING id, entity_id, name, sku, quantity, unit_cost, selling_price, reorder_point,
		          category, location, is_active, created_at, updated_at
	`, input.EntityID, input.Name, input.SKU, input.Quantity, input.UnitCost, input.SellingPrice,
		input.ReorderPoint, input.Category, input.Location).Scan(
		&i.ID, &i.EntityID, &i.Name, &i.SKU, &i.Quantity, &i.UnitCost, &i.SellingPrice,
		&i.ReorderPoint, &i.Category, &i.Location, &i.IsActive, &i.CreatedAt, &i.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create inventory item"})
		return
	}

	c.JSON(http.StatusCreated, i)
}

func (h *InventoryHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inventory ID"})
		return
	}

	var i models.Inventory
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, entity_id, name, sku, quantity, unit_cost, selling_price, reorder_point,
		       category, location, is_active, created_at, updated_at
		FROM inventory WHERE id = $1
	`, id).Scan(&i.ID, &i.EntityID, &i.Name, &i.SKU, &i.Quantity, &i.UnitCost, &i.SellingPrice,
		&i.ReorderPoint, &i.Category, &i.Location, &i.IsActive, &i.CreatedAt, &i.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory item not found"})
		return
	}

	c.JSON(http.StatusOK, i)
}

func (h *InventoryHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inventory ID"})
		return
	}

	var input models.InventoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var i models.Inventory
	err = database.DB.QueryRow(context.Background(), `
		UPDATE inventory 
		SET name = $1, sku = $2, quantity = $3, unit_cost = $4, selling_price = $5,
		    reorder_point = $6, category = $7, location = $8, updated_at = CURRENT_TIMESTAMP
		WHERE id = $9
		RETURNING id, entity_id, name, sku, quantity, unit_cost, selling_price, reorder_point,
		          category, location, is_active, created_at, updated_at
	`, input.Name, input.SKU, input.Quantity, input.UnitCost, input.SellingPrice,
		input.ReorderPoint, input.Category, input.Location, id).Scan(
		&i.ID, &i.EntityID, &i.Name, &i.SKU, &i.Quantity, &i.UnitCost, &i.SellingPrice,
		&i.ReorderPoint, &i.Category, &i.Location, &i.IsActive, &i.CreatedAt, &i.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory item not found"})
		return
	}

	c.JSON(http.StatusOK, i)
}

func (h *InventoryHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inventory ID"})
		return
	}

	_, err = database.DB.Exec(context.Background(), `UPDATE inventory SET is_active = false WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete inventory item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Inventory item deleted"})
}
