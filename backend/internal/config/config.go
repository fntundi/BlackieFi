package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	GinMode     string
	AI          AIConfig
}

type AIConfig struct {
	OpenAIKey    string
	AnthropicKey string
	GoogleAIKey  string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://blackiefi:blackiefi_secret@localhost:5432/blackiefi?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "your-super-secret-jwt-key"),
		GinMode:     getEnv("GIN_MODE", "debug"),
		AI: AIConfig{
			OpenAIKey:    getEnv("OPENAI_API_KEY", ""),
			AnthropicKey: getEnv("ANTHROPIC_API_KEY", ""),
			GoogleAIKey:  getEnv("GOOGLE_AI_API_KEY", ""),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		parsed, err := strconv.ParseBool(value)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}
