package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/blackiefi/backend/internal/config"
	"github.com/blackiefi/backend/internal/database"
	"github.com/blackiefi/backend/internal/models"
	"github.com/google/uuid"
)

// AIService provides AI functionality with support for multiple LLM providers
type AIService struct {
	config *config.Config
}

func NewAIService(cfg *config.Config) *AIService {
	return &AIService{config: cfg}
}

// IsAIEnabled checks if AI is enabled for both system and user
func (s *AIService) IsAIEnabled(ctx context.Context, userID uuid.UUID) (bool, string, error) {
	// Check system settings
	var systemAIEnabled bool
	var defaultProvider string
	err := database.DB.QueryRow(ctx, `
		SELECT ai_enabled, default_llm_provider FROM system_settings WHERE id = 1
	`).Scan(&systemAIEnabled, &defaultProvider)
	if err != nil {
		return false, "", err
	}

	if !systemAIEnabled {
		return false, "", nil
	}

	// Check user settings
	var userAIEnabled bool
	var userProvider string
	err = database.DB.QueryRow(ctx, `
		SELECT ai_enabled, preferred_llm_provider FROM users WHERE id = $1
	`, userID).Scan(&userAIEnabled, &userProvider)
	if err != nil {
		return false, "", err
	}

	if !userAIEnabled {
		return false, "", nil
	}

	// Use user's preferred provider if set, otherwise system default
	provider := userProvider
	if provider == "" {
		provider = defaultProvider
	}

	return true, provider, nil
}

// GetAPIKey returns the API key for the specified provider
func (s *AIService) GetAPIKey(provider string) (string, error) {
	switch provider {
	case models.LLMProviderOpenAI:
		if s.config.AI.OpenAIKey == "" {
			return "", errors.New("OpenAI API key not configured")
		}
		return s.config.AI.OpenAIKey, nil
	case models.LLMProviderAnthropic:
		if s.config.AI.AnthropicKey == "" {
			return "", errors.New("Anthropic API key not configured")
		}
		return s.config.AI.AnthropicKey, nil
	case models.LLMProviderGoogle:
		if s.config.AI.GoogleAIKey == "" {
			return "", errors.New("Google AI API key not configured")
		}
		return s.config.AI.GoogleAIKey, nil
	default:
		return "", fmt.Errorf("unknown LLM provider: %s", provider)
	}
}

// AIRequest represents a request to the AI service
type AIRequest struct {
	Prompt       string                 `json:"prompt"`
	MaxTokens    int                    `json:"max_tokens"`
	Temperature  float64                `json:"temperature"`
	SystemPrompt string                 `json:"system_prompt"`
	Context      map[string]interface{} `json:"context"`
}

// AIResponse represents a response from the AI service
type AIResponse struct {
	Content  string `json:"content"`
	Provider string `json:"provider"`
	Model    string `json:"model"`
}

// InvokeLLM invokes the appropriate LLM based on user/system settings
// This is a placeholder for the actual LLM integration
func (s *AIService) InvokeLLM(ctx context.Context, userID uuid.UUID, request AIRequest) (*AIResponse, error) {
	enabled, provider, err := s.IsAIEnabled(ctx, userID)
	if err != nil {
		return nil, err
	}

	if !enabled {
		return nil, errors.New("AI features are not enabled")
	}

	apiKey, err := s.GetAPIKey(provider)
	if err != nil {
		return nil, err
	}

	// Placeholder for actual LLM integration
	// In production, this would call the appropriate LLM API
	_ = apiKey // Suppress unused warning

	return &AIResponse{
		Content:  fmt.Sprintf("[AI Integration Placeholder] Provider: %s - Request received: %s", provider, request.Prompt[:min(50, len(request.Prompt))]+"..."),
		Provider: provider,
		Model:    getModelForProvider(provider),
	}, nil
}

func getModelForProvider(provider string) string {
	switch provider {
	case models.LLMProviderOpenAI:
		return "gpt-4"
	case models.LLMProviderAnthropic:
		return "claude-3-sonnet"
	case models.LLMProviderGoogle:
		return "gemini-pro"
	default:
		return "unknown"
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
