package database

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

func Connect(databaseURL string) error {
	var err error
	DB, err = pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		return fmt.Errorf("unable to connect to database: %w", err)
	}

	// Test connection
	if err := DB.Ping(context.Background()); err != nil {
		return fmt.Errorf("unable to ping database: %w", err)
	}

	log.Println("✅ Connected to PostgreSQL database")
	return nil
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}
