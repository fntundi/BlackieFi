package models

import "time"

type SystemSettings struct {
	ID                 int       `json:"id"`
	AIEnabled          bool      `json:"ai_enabled"`
	DefaultLLMProvider string    `json:"default_llm_provider"` // openai, anthropic, google
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type SystemSettingsUpdate struct {
	AIEnabled          *bool   `json:"ai_enabled"`
	DefaultLLMProvider *string `json:"default_llm_provider"`
}

// LLM Provider constants
const (
	LLMProviderOpenAI    = "openai"
	LLMProviderAnthropic = "anthropic"
	LLMProviderGoogle    = "google"
)

// Available LLM providers
var AvailableLLMProviders = []string{
	LLMProviderOpenAI,
	LLMProviderAnthropic,
	LLMProviderGoogle,
}
