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
		fmt.Printf("✓ La base de datos (%s) no existe. No hay nada que limpiar.\n", dbPath)
		return
	}

	err := os.Remove(dbPath)
	if err != nil {
		fmt.Printf("✗ Error al intentar eliminar la base de datos: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Base de datos (%s) eliminada exitosamente. Se recreará al iniciar el servidor.\n", dbPath)
}
