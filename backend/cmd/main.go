package main

import (
	"fmt"
	"log"
	"os"

	"github.com/blackiefi/backend/internal/config"
	"github.com/blackiefi/backend/internal/database"
	"github.com/blackiefi/backend/internal/handlers"
	"github.com/blackiefi/backend/internal/middleware"
	"github.com/blackiefi/backend/internal/utils"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if exists
	godotenv.Load()

	// Load configuration
	cfg := config.Load()

	// Initialize JWT
	utils.InitJWT(cfg.JWTSecret)

	// Handle commands
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "migrate":
			runMigrations(cfg)
			return
		case "seed":
			runSeed(cfg)
			return
		case "serve":
			// Continue to start server
		default:
			fmt.Println("Usage: blackiefi [serve|migrate|seed]")
			os.Exit(1)
		}
	}

	// Connect to database
	if err := database.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run migrations
	if err := database.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Setup Gin
	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000", "*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Initialize handlers
	authHandler := handlers.NewAuthHandler()
	entityHandler := handlers.NewEntityHandler()
	accountHandler := handlers.NewAccountHandler()
	categoryHandler := handlers.NewCategoryHandler()
	transactionHandler := handlers.NewTransactionHandler()
	recurringHandler := handlers.NewRecurringHandler()
	budgetHandler := handlers.NewBudgetHandler()
	debtHandler := handlers.NewDebtHandler()
	investmentHandler := handlers.NewInvestmentHandler()
	assetHandler := handlers.NewAssetHandler()
	inventoryHandler := handlers.NewInventoryHandler()
	goalHandler := handlers.NewGoalHandler()
	settingsHandler := handlers.NewSettingsHandler(cfg)

	// API routes
	api := r.Group("/api")
	{
		// Health check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok", "service": "blackiefi-api"})
		})

		// Auth routes (public)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/password-reset/request", authHandler.RequestPasswordReset)
			auth.POST("/password-reset", authHandler.ResetPassword)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// User routes
			protected.GET("/auth/me", authHandler.Me)
			protected.PUT("/auth/profile", authHandler.UpdateProfile)

			// Settings routes
			protected.GET("/settings", settingsHandler.GetSettings)
			protected.PUT("/settings", settingsHandler.UpdateSettings)
			protected.GET("/settings/ai-status", settingsHandler.GetAIStatus)

			// Entity routes
			protected.GET("/entities", entityHandler.List)
			protected.POST("/entities", entityHandler.Create)
			protected.GET("/entities/:id", entityHandler.Get)
			protected.PUT("/entities/:id", entityHandler.Update)
			protected.DELETE("/entities/:id", entityHandler.Delete)

			// Account routes
			protected.GET("/accounts", accountHandler.List)
			protected.POST("/accounts", accountHandler.Create)
			protected.GET("/accounts/:id", accountHandler.Get)
			protected.PUT("/accounts/:id", accountHandler.Update)
			protected.DELETE("/accounts/:id", accountHandler.Delete)

			// Category routes
			protected.GET("/categories", categoryHandler.List)
			protected.POST("/categories", categoryHandler.Create)
			protected.POST("/categories/bulk", categoryHandler.BulkCreate)
			protected.GET("/categories/:id", categoryHandler.Get)
			protected.PUT("/categories/:id", categoryHandler.Update)
			protected.DELETE("/categories/:id", categoryHandler.Delete)

			// Transaction routes
			protected.GET("/transactions", transactionHandler.List)
			protected.POST("/transactions", transactionHandler.Create)
			protected.POST("/transactions/bulk", transactionHandler.BulkCreate)
			protected.GET("/transactions/:id", transactionHandler.Get)
			protected.PUT("/transactions/:id", transactionHandler.Update)
			protected.DELETE("/transactions/:id", transactionHandler.Delete)

			// Recurring transaction routes
			protected.GET("/recurring", recurringHandler.List)
			protected.POST("/recurring", recurringHandler.Create)
			protected.GET("/recurring/:id", recurringHandler.Get)
			protected.PUT("/recurring/:id", recurringHandler.Update)
			protected.DELETE("/recurring/:id", recurringHandler.Delete)

			// Budget routes
			protected.GET("/budgets", budgetHandler.List)
			protected.POST("/budgets", budgetHandler.Create)
			protected.GET("/budgets/:id", budgetHandler.Get)
			protected.PUT("/budgets/:id", budgetHandler.Update)
			protected.DELETE("/budgets/:id", budgetHandler.Delete)

			// Debt routes
			protected.GET("/debts", debtHandler.List)
			protected.POST("/debts", debtHandler.Create)
			protected.GET("/debts/:id", debtHandler.Get)
			protected.PUT("/debts/:id", debtHandler.Update)
			protected.DELETE("/debts/:id", debtHandler.Delete)

			// Investment routes
			protected.GET("/investment-vehicles", investmentHandler.ListVehicles)
			protected.POST("/investment-vehicles", investmentHandler.CreateVehicle)
			protected.GET("/investment-vehicles/:id", investmentHandler.GetVehicle)
			protected.PUT("/investment-vehicles/:id", investmentHandler.UpdateVehicle)
			protected.DELETE("/investment-vehicles/:id", investmentHandler.DeleteVehicle)

			protected.GET("/investment-holdings", investmentHandler.ListHoldings)
			protected.POST("/investment-holdings", investmentHandler.CreateHolding)
			protected.GET("/investment-holdings/:id", investmentHandler.GetHolding)
			protected.PUT("/investment-holdings/:id", investmentHandler.UpdateHolding)
			protected.DELETE("/investment-holdings/:id", investmentHandler.DeleteHolding)

			// Asset routes
			protected.GET("/assets", assetHandler.List)
			protected.POST("/assets", assetHandler.Create)
			protected.GET("/assets/:id", assetHandler.Get)
			protected.PUT("/assets/:id", assetHandler.Update)
			protected.DELETE("/assets/:id", assetHandler.Delete)

			// Inventory routes
			protected.GET("/inventory", inventoryHandler.List)
			protected.POST("/inventory", inventoryHandler.Create)
			protected.GET("/inventory/:id", inventoryHandler.Get)
			protected.PUT("/inventory/:id", inventoryHandler.Update)
			protected.DELETE("/inventory/:id", inventoryHandler.Delete)

			// Financial goal routes
			protected.GET("/goals", goalHandler.List)
			protected.POST("/goals", goalHandler.Create)
			protected.GET("/goals/:id", goalHandler.Get)
			protected.PUT("/goals/:id", goalHandler.Update)
			protected.PATCH("/goals/:id/status", goalHandler.UpdateStatus)
			protected.DELETE("/goals/:id", goalHandler.Delete)
		}
	}

	// Start server
	log.Printf("🚀 BlackieFi API server starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func runMigrations(cfg *config.Config) {
	if err := database.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	if err := database.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
}

func runSeed(cfg *config.Config) {
	if err := database.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	if err := database.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	if err := database.SeedDatabase(); err != nil {
		log.Fatalf("Failed to seed database: %v", err)
	}
}
