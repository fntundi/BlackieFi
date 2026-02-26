package handlers

import (
	"context"
	"net/http"

	"github.com/blackiefi/backend/internal/config"
	"github.com/blackiefi/backend/internal/database"
	"github.com/blackiefi/backend/internal/models"
	"github.com/gin-gonic/gin"
)

type SettingsHandler struct {
	config *config.Config
}

func NewSettingsHandler(cfg *config.Config) *SettingsHandler {
	return &SettingsHandler{config: cfg}
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	var settings models.SystemSettings
	err := database.DB.QueryRow(context.Background(), `
		SELECT id, ai_enabled, default_llm_provider, created_at, updated_at
		FROM system_settings WHERE id = 1
	`).Scan(&settings.ID, &settings.AIEnabled, &settings.DefaultLLMProvider, &settings.CreatedAt, &settings.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	// Add available LLM providers info
	response := gin.H{
		"settings":                settings,
		"available_llm_providers": models.AvailableLLMProviders,
		"llm_keys_configured": gin.H{
			"openai":    h.config.AI.OpenAIKey != "",
			"anthropic": h.config.AI.AnthropicKey != "",
			"google":    h.config.AI.GoogleAIKey != "",
		},
	}

	c.JSON(http.StatusOK, response)
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	// Only admin can update system settings
	role, _ := c.Get("role")
	if role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	var input models.SystemSettingsUpdate
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// If enabling AI, check that at least one LLM key is configured
	if input.AIEnabled != nil && *input.AIEnabled {
		if h.config.AI.OpenAIKey == "" && h.config.AI.AnthropicKey == "" && h.config.AI.GoogleAIKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Cannot enable AI features: No LLM API keys configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY environment variable.",
			})
			return
		}

		// If changing provider, validate key exists for that provider
		if input.DefaultLLMProvider != nil {
			switch *input.DefaultLLMProvider {
			case models.LLMProviderOpenAI:
				if h.config.AI.OpenAIKey == "" {
					c.JSON(http.StatusBadRequest, gin.H{"error": "OpenAI API key not configured"})
					return
				}
			case models.LLMProviderAnthropic:
				if h.config.AI.AnthropicKey == "" {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Anthropic API key not configured"})
					return
				}
			case models.LLMProviderGoogle:
				if h.config.AI.GoogleAIKey == "" {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Google AI API key not configured"})
					return
				}
			default:
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid LLM provider"})
				return
			}
		}
	}

	var settings models.SystemSettings
	err := database.DB.QueryRow(context.Background(), `
		UPDATE system_settings 
		SET ai_enabled = COALESCE($1, ai_enabled),
		    default_llm_provider = COALESCE($2, default_llm_provider),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = 1
		RETURNING id, ai_enabled, default_llm_provider, created_at, updated_at
	`, input.AIEnabled, input.DefaultLLMProvider).Scan(
		&settings.ID, &settings.AIEnabled, &settings.DefaultLLMProvider, &settings.CreatedAt, &settings.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) GetAIStatus(c *gin.Context) {
	userID := GetUserID(c)

	// Get system settings
	var systemSettings models.SystemSettings
	err := database.DB.QueryRow(context.Background(), `
		SELECT ai_enabled, default_llm_provider FROM system_settings WHERE id = 1
	`).Scan(&systemSettings.AIEnabled, &systemSettings.DefaultLLMProvider)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch system settings"})
		return
	}

	// Get user AI settings
	var userAIEnabled bool
	var userLLMProvider string
	err = database.DB.QueryRow(context.Background(), `
		SELECT ai_enabled, preferred_llm_provider FROM users WHERE id = $1
	`, userID).Scan(&userAIEnabled, &userLLMProvider)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user settings"})
		return
	}

	// AI is only available if both system-wide AND account-level are enabled
	aiAvailable := systemSettings.AIEnabled && userAIEnabled

	c.JSON(http.StatusOK, gin.H{
		"ai_available":            aiAvailable,
		"system_ai_enabled":       systemSettings.AIEnabled,
		"account_ai_enabled":      userAIEnabled,
		"effective_llm_provider":  userLLMProvider,
		"available_llm_providers": models.AvailableLLMProviders,
	})
}
