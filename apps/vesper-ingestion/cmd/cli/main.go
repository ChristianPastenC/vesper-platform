package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Sovereign Telemetry CLI")
		fmt.Println("Usage: go run ./cmd/cli [command]")
		fmt.Println("\nCommands:")
		fmt.Println("  clean-db    Clears all records from the SQLite database")
		os.Exit(1)
	}

	command := os.Args[1]

	if command == "clean-db" {
		dbPath := "telemetry.db"
		if _, err := os.Stat(dbPath); os.IsNotExist(err) {
			fmt.Println("Database does not exist yet. Nothing to clean.")
			return
		}

		db, err := sql.Open("sqlite3", dbPath)
		if err != nil {
			log.Fatalf("Failed to open database: %v", err)
		}
		defer db.Close()

		fmt.Println("Cleaning database...")

		tables := []string{"metrics", "api_keys", "tenants"}
		for _, t := range tables {
			_, err := db.Exec("DELETE FROM " + t)
			if err != nil {
				log.Fatalf("Failed to clear %s: %v", t, err)
			}
			fmt.Printf("Cleared table: %s\n", t)
		}

		fmt.Println("Database successfully cleaned. Note: Seed data will be recreated automatically next time the server starts.")
	} else {
		fmt.Printf("Unknown command: %s\n", command)
		os.Exit(1)
	}
}
