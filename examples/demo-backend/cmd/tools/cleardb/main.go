package main

import (
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/sovereign.db"
	}

	// Normalize path
	dbPath = filepath.Clean(dbPath)

	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		fmt.Printf("✓ Database (%s) does not exist. Nothing to clean.\n", dbPath)
		return
	}

	err := os.Remove(dbPath)
	if err != nil {
		fmt.Printf("✗ Error deleting database: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Database (%s) successfully deleted. It will be recreated upon server startup.\n", dbPath)
}
