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

type AssetHandler struct{}

func NewAssetHandler() *AssetHandler {
	return &AssetHandler{}
}

func (h *AssetHandler) List(c *gin.Context) {
	entityID := c.Query("entity_id")
	isActive := c.DefaultQuery("is_active", "true")

	query := `
		SELECT id, entity_id, name, type, description, purchase_date, purchase_price, current_value,
		       depreciation_method, useful_life_years, salvage_value, location, serial_number,
		       vendor, warranty_expiration, maintenance_schedule, is_active, created_at, updated_at
		FROM assets WHERE 1=1
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch assets"})
		return
	}
	defer rows.Close()

	assets := []models.Asset{}
	for rows.Next() {
		var a models.Asset
		err := rows.Scan(&a.ID, &a.EntityID, &a.Name, &a.Type, &a.Description, &a.PurchaseDate,
			&a.PurchasePrice, &a.CurrentValue, &a.DepreciationMethod, &a.UsefulLifeYears, &a.SalvageValue,
			&a.Location, &a.SerialNumber, &a.Vendor, &a.WarrantyExpiration, &a.MaintenanceSchedule,
			&a.IsActive, &a.CreatedAt, &a.UpdatedAt)
		if err != nil {
			continue
		}
		assets = append(assets, a)
	}

	c.JSON(http.StatusOK, assets)
}

func (h *AssetHandler) Create(c *gin.Context) {
	var input models.AssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var a models.Asset
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO assets (entity_id, name, type, description, purchase_date, purchase_price, current_value,
		                    depreciation_method, useful_life_years, salvage_value, location, serial_number,
		                    vendor, warranty_expiration, maintenance_schedule, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
		RETURNING id, entity_id, name, type, description, purchase_date, purchase_price, current_value,
		          depreciation_method, useful_life_years, salvage_value, location, serial_number,
		          vendor, warranty_expiration, maintenance_schedule, is_active, created_at, updated_at
	`, input.EntityID, input.Name, input.Type, input.Description, input.PurchaseDate, input.PurchasePrice,
		input.CurrentValue, input.DepreciationMethod, input.UsefulLifeYears, input.SalvageValue,
		input.Location, input.SerialNumber, input.Vendor, input.WarrantyExpiration, input.MaintenanceSchedule).Scan(
		&a.ID, &a.EntityID, &a.Name, &a.Type, &a.Description, &a.PurchaseDate, &a.PurchasePrice,
		&a.CurrentValue, &a.DepreciationMethod, &a.UsefulLifeYears, &a.SalvageValue, &a.Location,
		&a.SerialNumber, &a.Vendor, &a.WarrantyExpiration, &a.MaintenanceSchedule, &a.IsActive,
		&a.CreatedAt, &a.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create asset"})
		return
	}

	c.JSON(http.StatusCreated, a)
}

func (h *AssetHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	var a models.Asset
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, entity_id, name, type, description, purchase_date, purchase_price, current_value,
		       depreciation_method, useful_life_years, salvage_value, location, serial_number,
		       vendor, warranty_expiration, maintenance_schedule, is_active, created_at, updated_at
		FROM assets WHERE id = $1
	`, id).Scan(&a.ID, &a.EntityID, &a.Name, &a.Type, &a.Description, &a.PurchaseDate, &a.PurchasePrice,
		&a.CurrentValue, &a.DepreciationMethod, &a.UsefulLifeYears, &a.SalvageValue, &a.Location,
		&a.SerialNumber, &a.Vendor, &a.WarrantyExpiration, &a.MaintenanceSchedule, &a.IsActive,
		&a.CreatedAt, &a.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	c.JSON(http.StatusOK, a)
}

func (h *AssetHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	var input models.AssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var a models.Asset
	err = database.DB.QueryRow(context.Background(), `
		UPDATE assets 
		SET name = $1, type = $2, description = $3, purchase_date = $4, purchase_price = $5,
		    current_value = $6, depreciation_method = $7, useful_life_years = $8, salvage_value = $9,
		    location = $10, serial_number = $11, vendor = $12, warranty_expiration = $13,
		    maintenance_schedule = $14, updated_at = CURRENT_TIMESTAMP
		WHERE id = $15
		RETURNING id, entity_id, name, type, description, purchase_date, purchase_price, current_value,
		          depreciation_method, useful_life_years, salvage_value, location, serial_number,
		          vendor, warranty_expiration, maintenance_schedule, is_active, created_at, updated_at
	`, input.Name, input.Type, input.Description, input.PurchaseDate, input.PurchasePrice,
		input.CurrentValue, input.DepreciationMethod, input.UsefulLifeYears, input.SalvageValue,
		input.Location, input.SerialNumber, input.Vendor, input.WarrantyExpiration,
		input.MaintenanceSchedule, id).Scan(
		&a.ID, &a.EntityID, &a.Name, &a.Type, &a.Description, &a.PurchaseDate, &a.PurchasePrice,
		&a.CurrentValue, &a.DepreciationMethod, &a.UsefulLifeYears, &a.SalvageValue, &a.Location,
		&a.SerialNumber, &a.Vendor, &a.WarrantyExpiration, &a.MaintenanceSchedule, &a.IsActive,
		&a.CreatedAt, &a.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	c.JSON(http.StatusOK, a)
}

func (h *AssetHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	_, err = database.DB.Exec(context.Background(), `UPDATE assets SET is_active = false WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete asset"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Asset deleted"})
}
