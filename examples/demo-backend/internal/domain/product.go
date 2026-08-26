package domain

import "context"

// Product represents a catalog item mapping to a unique ID, barcode, and metadata.
type Product struct {
	ID          int     `json:"id"`
	Title       string  `json:"title"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Image       string  `json:"image"`
	Barcode     string  `json:"barcode"` // Simulated EAN-13/UPC barcode
}

// CartItem represents an item within a user's transaction/shopping cart.
type CartItem struct {
	ProductID int `json:"productId"`
	Quantity  int `json:"quantity"`
}

// CatalogQuery encapsulates filter criteria for fetching products from the catalog.
type CatalogQuery struct {
	Category string `json:"category"`
	Limit    int    `json:"limit"`
}

// ProductGateway defines the outbound port to retrieve product catalog data.
type ProductGateway interface {
	GetProducts(ctx context.Context, query CatalogQuery) ([]Product, error)
}
