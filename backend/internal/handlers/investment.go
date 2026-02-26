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

type InvestmentHandler struct{}

func NewInvestmentHandler() *InvestmentHandler {
	return &InvestmentHandler{}
}

// Vehicle endpoints
func (h *InvestmentHandler) ListVehicles(c *gin.Context) {
	entityID := c.Query("entity_id")
	isActive := c.DefaultQuery("is_active", "true")

	query := `
		SELECT id, entity_id, name, type, provider, is_active, created_at, updated_at
		FROM investment_vehicles WHERE 1=1
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vehicles"})
		return
	}
	defer rows.Close()

	vehicles := []models.InvestmentVehicle{}
	for rows.Next() {
		var v models.InvestmentVehicle
		err := rows.Scan(&v.ID, &v.EntityID, &v.Name, &v.Type, &v.Provider, &v.IsActive, &v.CreatedAt, &v.UpdatedAt)
		if err != nil {
			continue
		}
		vehicles = append(vehicles, v)
	}

	c.JSON(http.StatusOK, vehicles)
}

func (h *InvestmentHandler) CreateVehicle(c *gin.Context) {
	var input models.InvestmentVehicleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var v models.InvestmentVehicle
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO investment_vehicles (entity_id, name, type, provider, is_active)
		VALUES ($1, $2, $3, $4, true)
		RETURNING id, entity_id, name, type, provider, is_active, created_at, updated_at
	`, input.EntityID, input.Name, input.Type, input.Provider).Scan(
		&v.ID, &v.EntityID, &v.Name, &v.Type, &v.Provider, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create vehicle"})
		return
	}

	c.JSON(http.StatusCreated, v)
}

func (h *InvestmentHandler) GetVehicle(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vehicle ID"})
		return
	}

	var v models.InvestmentVehicle
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, entity_id, name, type, provider, is_active, created_at, updated_at
		FROM investment_vehicles WHERE id = $1
	`, id).Scan(&v.ID, &v.EntityID, &v.Name, &v.Type, &v.Provider, &v.IsActive, &v.CreatedAt, &v.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vehicle not found"})
		return
	}

	c.JSON(http.StatusOK, v)
}

func (h *InvestmentHandler) UpdateVehicle(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vehicle ID"})
		return
	}

	var input models.InvestmentVehicleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var v models.InvestmentVehicle
	err = database.DB.QueryRow(context.Background(), `
		UPDATE investment_vehicles SET name = $1, type = $2, provider = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
		RETURNING id, entity_id, name, type, provider, is_active, created_at, updated_at
	`, input.Name, input.Type, input.Provider, id).Scan(
		&v.ID, &v.EntityID, &v.Name, &v.Type, &v.Provider, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vehicle not found"})
		return
	}

	c.JSON(http.StatusOK, v)
}

func (h *InvestmentHandler) DeleteVehicle(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vehicle ID"})
		return
	}

	_, err = database.DB.Exec(context.Background(), `UPDATE investment_vehicles SET is_active = false WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete vehicle"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vehicle deleted"})
}

// Holding endpoints
func (h *InvestmentHandler) ListHoldings(c *gin.Context) {
	vehicleID := c.Query("vehicle_id")

	query := `
		SELECT id, vehicle_id, asset_name, asset_class, quantity, cost_basis, current_price,
		       benchmark_symbol, last_updated, created_at, updated_at
		FROM investment_holdings
	`
	args := []interface{}{}

	if vehicleID != "" {
		query += " WHERE vehicle_id = $1"
		args = append(args, vehicleID)
	}
	query += " ORDER BY asset_name"

	rows, err := database.DB.Query(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch holdings"})
		return
	}
	defer rows.Close()

	holdings := []models.InvestmentHolding{}
	for rows.Next() {
		var h models.InvestmentHolding
		err := rows.Scan(&h.ID, &h.VehicleID, &h.AssetName, &h.AssetClass, &h.Quantity, &h.CostBasis,
			&h.CurrentPrice, &h.BenchmarkSymbol, &h.LastUpdated, &h.CreatedAt, &h.UpdatedAt)
		if err != nil {
			continue
		}
		holdings = append(holdings, h)
	}

	c.JSON(http.StatusOK, holdings)
}

func (h *InvestmentHandler) CreateHolding(c *gin.Context) {
	var input models.InvestmentHoldingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var holding models.InvestmentHolding
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO investment_holdings (vehicle_id, asset_name, asset_class, quantity, cost_basis, current_price, benchmark_symbol)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, vehicle_id, asset_name, asset_class, quantity, cost_basis, current_price,
		          benchmark_symbol, last_updated, created_at, updated_at
	`, input.VehicleID, input.AssetName, input.AssetClass, input.Quantity, input.CostBasis,
		input.CurrentPrice, input.BenchmarkSymbol).Scan(
		&holding.ID, &holding.VehicleID, &holding.AssetName, &holding.AssetClass, &holding.Quantity,
		&holding.CostBasis, &holding.CurrentPrice, &holding.BenchmarkSymbol, &holding.LastUpdated,
		&holding.CreatedAt, &holding.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create holding"})
		return
	}

	c.JSON(http.StatusCreated, holding)
}

func (h *InvestmentHandler) GetHolding(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid holding ID"})
		return
	}

	var holding models.InvestmentHolding
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, vehicle_id, asset_name, asset_class, quantity, cost_basis, current_price,
		       benchmark_symbol, last_updated, created_at, updated_at
		FROM investment_holdings WHERE id = $1
	`, id).Scan(&holding.ID, &holding.VehicleID, &holding.AssetName, &holding.AssetClass, &holding.Quantity,
		&holding.CostBasis, &holding.CurrentPrice, &holding.BenchmarkSymbol, &holding.LastUpdated,
		&holding.CreatedAt, &holding.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Holding not found"})
		return
	}

	c.JSON(http.StatusOK, holding)
}

func (h *InvestmentHandler) UpdateHolding(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid holding ID"})
		return
	}

	var input models.InvestmentHoldingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var holding models.InvestmentHolding
	err = database.DB.QueryRow(context.Background(), `
		UPDATE investment_holdings 
		SET asset_name = $1, asset_class = $2, quantity = $3, cost_basis = $4, 
		    current_price = $5, benchmark_symbol = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $7
		RETURNING id, vehicle_id, asset_name, asset_class, quantity, cost_basis, current_price,
		          benchmark_symbol, last_updated, created_at, updated_at
	`, input.AssetName, input.AssetClass, input.Quantity, input.CostBasis,
		input.CurrentPrice, input.BenchmarkSymbol, id).Scan(
		&holding.ID, &holding.VehicleID, &holding.AssetName, &holding.AssetClass, &holding.Quantity,
		&holding.CostBasis, &holding.CurrentPrice, &holding.BenchmarkSymbol, &holding.LastUpdated,
		&holding.CreatedAt, &holding.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Holding not found"})
		return
	}

	c.JSON(http.StatusOK, holding)
}

func (h *InvestmentHandler) DeleteHolding(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid holding ID"})
		return
	}

	_, err = database.DB.Exec(context.Background(), `DELETE FROM investment_holdings WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete holding"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Holding deleted"})
}
