package handlers

import (
	"context"
	"net/http"

	"github.com/blackiefi/backend/internal/database"
	"github.com/blackiefi/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type EntityHandler struct{}

func NewEntityHandler() *EntityHandler {
	return &EntityHandler{}
}

func (h *EntityHandler) List(c *gin.Context) {
	userID := GetUserID(c)
	role, _ := c.Get("role")

	var rows interface{}
	var err error

	if role == "admin" {
		rows, err = database.DB.Query(context.Background(), `
			SELECT id, owner_id, name, type, created_at, updated_at FROM entities ORDER BY name
		`)
	} else {
		rows, err = database.DB.Query(context.Background(), `
			SELECT e.id, e.owner_id, e.name, e.type, e.created_at, e.updated_at 
			FROM entities e
			LEFT JOIN group_entity_access gea ON e.id = gea.entity_id
			LEFT JOIN group_members gm ON gea.group_id = gm.group_id
			WHERE e.owner_id = $1 OR gm.user_id = $1
			GROUP BY e.id
			ORDER BY e.name
		`, userID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch entities"})
		return
	}

	pgRows := rows.(interface{ Close(); Next() bool; Scan(...interface{}) error })
	defer pgRows.Close()

	entities := []models.Entity{}
	for pgRows.Next() {
		var entity models.Entity
		err := pgRows.Scan(&entity.ID, &entity.OwnerID, &entity.Name, &entity.Type, &entity.CreatedAt, &entity.UpdatedAt)
		if err != nil {
			continue
		}
		entities = append(entities, entity)
	}

	c.JSON(http.StatusOK, entities)
}

func (h *EntityHandler) Create(c *gin.Context) {
	userID := GetUserID(c)

	var input models.EntityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var entity models.Entity
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO entities (owner_id, name, type)
		VALUES ($1, $2, $3)
		RETURNING id, owner_id, name, type, created_at, updated_at
	`, userID, input.Name, input.Type).Scan(
		&entity.ID, &entity.OwnerID, &entity.Name, &entity.Type, &entity.CreatedAt, &entity.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create entity"})
		return
	}

	c.JSON(http.StatusCreated, entity)
}

func (h *EntityHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	var entity models.Entity
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, owner_id, name, type, created_at, updated_at FROM entities WHERE id = $1
	`, id).Scan(&entity.ID, &entity.OwnerID, &entity.Name, &entity.Type, &entity.CreatedAt, &entity.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entity not found"})
		return
	}

	c.JSON(http.StatusOK, entity)
}

func (h *EntityHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	var input models.EntityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var entity models.Entity
	err = database.DB.QueryRow(context.Background(), `
		UPDATE entities SET name = $1, type = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
		RETURNING id, owner_id, name, type, created_at, updated_at
	`, input.Name, input.Type, id).Scan(
		&entity.ID, &entity.OwnerID, &entity.Name, &entity.Type, &entity.CreatedAt, &entity.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entity not found"})
		return
	}

	c.JSON(http.StatusOK, entity)
}

func (h *EntityHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	_, err = database.DB.Exec(context.Background(), `DELETE FROM entities WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete entity"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Entity deleted"})
}
