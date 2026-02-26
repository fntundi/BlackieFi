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

type GoalHandler struct{}

func NewGoalHandler() *GoalHandler {
	return &GoalHandler{}
}

func (h *GoalHandler) List(c *gin.Context) {
	entityID := c.Query("entity_id")
	status := c.Query("status")

	query := `
		SELECT id, entity_id, name, goal_type, target_amount, current_amount, deadline,
		       monthly_contribution, priority, status, notes, ai_recommendations, created_at, updated_at
		FROM financial_goals WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if entityID != "" {
		query += " AND entity_id = $" + strconv.Itoa(argIndex)
		args = append(args, entityID)
		argIndex++
	}
	if status != "" {
		query += " AND status = $" + strconv.Itoa(argIndex)
		args = append(args, status)
	}
	query += " ORDER BY priority DESC, deadline"

	rows, err := database.DB.Query(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch goals"})
		return
	}
	defer rows.Close()

	goals := []models.FinancialGoal{}
	for rows.Next() {
		var g models.FinancialGoal
		err := rows.Scan(&g.ID, &g.EntityID, &g.Name, &g.GoalType, &g.TargetAmount, &g.CurrentAmount,
			&g.Deadline, &g.MonthlyContribution, &g.Priority, &g.Status, &g.Notes, &g.AIRecommendations,
			&g.CreatedAt, &g.UpdatedAt)
		if err != nil {
			continue
		}
		goals = append(goals, g)
	}

	c.JSON(http.StatusOK, goals)
}

func (h *GoalHandler) Create(c *gin.Context) {
	var input models.FinancialGoalInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	priority := input.Priority
	if priority == "" {
		priority = "medium"
	}

	var g models.FinancialGoal
	err := database.DB.QueryRow(context.Background(), `
		INSERT INTO financial_goals (entity_id, name, goal_type, target_amount, current_amount, deadline,
		                             monthly_contribution, priority, status, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
		RETURNING id, entity_id, name, goal_type, target_amount, current_amount, deadline,
		          monthly_contribution, priority, status, notes, ai_recommendations, created_at, updated_at
	`, input.EntityID, input.Name, input.GoalType, input.TargetAmount, input.CurrentAmount,
		input.Deadline, input.MonthlyContribution, priority, input.Notes).Scan(
		&g.ID, &g.EntityID, &g.Name, &g.GoalType, &g.TargetAmount, &g.CurrentAmount, &g.Deadline,
		&g.MonthlyContribution, &g.Priority, &g.Status, &g.Notes, &g.AIRecommendations,
		&g.CreatedAt, &g.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create goal"})
		return
	}

	c.JSON(http.StatusCreated, g)
}

func (h *GoalHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid goal ID"})
		return
	}

	var g models.FinancialGoal
	err = database.DB.QueryRow(context.Background(), `
		SELECT id, entity_id, name, goal_type, target_amount, current_amount, deadline,
		       monthly_contribution, priority, status, notes, ai_recommendations, created_at, updated_at
		FROM financial_goals WHERE id = $1
	`, id).Scan(&g.ID, &g.EntityID, &g.Name, &g.GoalType, &g.TargetAmount, &g.CurrentAmount,
		&g.Deadline, &g.MonthlyContribution, &g.Priority, &g.Status, &g.Notes, &g.AIRecommendations,
		&g.CreatedAt, &g.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	c.JSON(http.StatusOK, g)
}

func (h *GoalHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid goal ID"})
		return
	}

	var input models.FinancialGoalInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var g models.FinancialGoal
	err = database.DB.QueryRow(context.Background(), `
		UPDATE financial_goals 
		SET name = $1, goal_type = $2, target_amount = $3, current_amount = $4, deadline = $5,
		    monthly_contribution = $6, priority = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
		WHERE id = $9
		RETURNING id, entity_id, name, goal_type, target_amount, current_amount, deadline,
		          monthly_contribution, priority, status, notes, ai_recommendations, created_at, updated_at
	`, input.Name, input.GoalType, input.TargetAmount, input.CurrentAmount, input.Deadline,
		input.MonthlyContribution, input.Priority, input.Notes, id).Scan(
		&g.ID, &g.EntityID, &g.Name, &g.GoalType, &g.TargetAmount, &g.CurrentAmount, &g.Deadline,
		&g.MonthlyContribution, &g.Priority, &g.Status, &g.Notes, &g.AIRecommendations,
		&g.CreatedAt, &g.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	c.JSON(http.StatusOK, g)
}

func (h *GoalHandler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid goal ID"})
		return
	}

	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var g models.FinancialGoal
	err = database.DB.QueryRow(context.Background(), `
		UPDATE financial_goals SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
		RETURNING id, entity_id, name, goal_type, target_amount, current_amount, deadline,
		          monthly_contribution, priority, status, notes, ai_recommendations, created_at, updated_at
	`, input.Status, id).Scan(
		&g.ID, &g.EntityID, &g.Name, &g.GoalType, &g.TargetAmount, &g.CurrentAmount, &g.Deadline,
		&g.MonthlyContribution, &g.Priority, &g.Status, &g.Notes, &g.AIRecommendations,
		&g.CreatedAt, &g.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	c.JSON(http.StatusOK, g)
}

func (h *GoalHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid goal ID"})
		return
	}

	_, err = database.DB.Exec(context.Background(), `DELETE FROM financial_goals WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete goal"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Goal deleted"})
}
