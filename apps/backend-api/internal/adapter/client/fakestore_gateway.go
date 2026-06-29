package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"

	"sovereign-core/backend-api/internal/domain"
)

// FakeStoreProduct represents the raw JSON structure returned by fakestoreapi.com.
type FakeStoreProduct struct {
	ID          int     `json:"id"`
	Title       string  `json:"title"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Image       string  `json:"image"`
}

// FakeStoreGateway consumes products from FakeStoreAPI and adapts them to the domain model.
type FakeStoreGateway struct {
	client  *http.Client
	baseURL string
}

// NewFakeStoreGateway initializes a FakeStoreGateway with a default 5-second timeout client.
func NewFakeStoreGateway() *FakeStoreGateway {
	return &FakeStoreGateway{
		client: &http.Client{
			Timeout:   5 * time.Second,
			Transport: NewResilientRoundTripper(http.DefaultTransport),
		},
		baseURL: "https://fakestoreapi.com/products",
	}
}

// GetProducts fetches product data from FakeStoreAPI, applying category and limit parameters,
// and maps them into optimized domain Products with simulated EAN-13 barcodes.
func (f *FakeStoreGateway) GetProducts(ctx context.Context, query domain.CatalogQuery) ([]domain.Product, error) {
	ctx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	targetURL := f.baseURL

	// 1. Determine base endpoint based on category
	if query.Category != "" {
		targetURL = fmt.Sprintf("%s/category/%s", f.baseURL, url.PathEscape(query.Category))
	}

	// 2. Append limit parameter if set
	if query.Limit > 0 {
		targetURL = fmt.Sprintf("%s?limit=%d", targetURL, query.Limit)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("fakestore_gateway: failed to create request: %v", err)
		return f.getFallbackProducts(query), nil
	}

	resp, err := f.client.Do(req)
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) || errors.Is(err, context.DeadlineExceeded) {
			log.Printf("fakestore_gateway: timeout fetching products")
		} else {
			log.Printf("fakestore_gateway: request failed: %v", err)
		}
		return f.getFallbackProducts(query), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("fakestore_gateway: returned non-200 status: %d", resp.StatusCode)
		return f.getFallbackProducts(query), nil
	}

	var rawProducts []FakeStoreProduct
	if err := json.NewDecoder(io.LimitReader(resp.Body, 2*1024*1024)).Decode(&rawProducts); err != nil {
		log.Printf("fakestore_gateway: failed to decode JSON payload: %v", err)
		return f.getFallbackProducts(query), nil
	}

	// 3. Map to domain products and generate barcode
	products := make([]domain.Product, len(rawProducts))
	for i, rp := range rawProducts {
		products[i] = domain.Product{
			ID:          rp.ID,
			Title:       rp.Title,
			Price:       rp.Price,
			Description: rp.Description,
			Category:    rp.Category,
			Image:       rp.Image,
			Barcode:     generateEAN13(rp.ID),
		}
	}

	return products, nil
}

// getFallbackProducts returns an in-memory mock catalog if the external API fails.
func (f *FakeStoreGateway) getFallbackProducts(query domain.CatalogQuery) []domain.Product {
	mockProducts := []domain.Product{
		{
			ID:          1,
			Title:       "Fjallraven - Foldsack No. 1 Backpack",
			Price:       109.95,
			Description: "Your perfect pack for everyday use and walks in the forest.",
			Category:    "men's clothing",
			Image:       "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg",
			Barcode:     generateEAN13(1),
		},
		{
			ID:          2,
			Title:       "Mens Casual Premium T-Shirts",
			Price:       22.3,
			Description: "Slim-fitting style, contrast raglan sleeve, three-button henley placket.",
			Category:    "men's clothing",
			Image:       "https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg",
			Barcode:     generateEAN13(2),
		},
		{
			ID:          3,
			Title:       "Mens Cotton Jacket",
			Price:       55.99,
			Description: "Great outerwear jackets for Spring/Autumn/Winter, suitable for many occasions.",
			Category:    "men's clothing",
			Image:       "https://fakestoreapi.com/img/71li-ujtlAL._AC_UX679_.jpg",
			Barcode:     generateEAN13(3),
		},
		{
			ID:          4,
			Title:       "Mens Casual Slim Fit",
			Price:       15.99,
			Description: "The color could be slightly different between on the screen and in practice.",
			Category:    "men's clothing",
			Image:       "https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_.jpg",
			Barcode:     generateEAN13(4),
		},
	}

	if query.Limit > 0 && query.Limit < len(mockProducts) {
		return mockProducts[:query.Limit]
	}

	return mockProducts
}

// generateEAN13 creates a syntactically valid EAN-13 barcode based on a numeric ID.
func generateEAN13(id int) string {
	// Base barcode has 12 digits. Country code "400" (Germany) + manufacturer/item digits.
	base := fmt.Sprintf("4006381%05d", id%100000)

	// Calculate EAN-13 check digit
	sum := 0
	for i, r := range base {
		digit := int(r - '0')
		if i%2 == 0 {
			// Odd positions: 1st, 3rd, 5th, 7th, 9th, 11th (0-indexed: 0, 2, 4...)
			sum += digit
		} else {
			// Even positions: 2nd, 4th, 6th, 8th, 10th, 12th (0-indexed: 1, 3, 5...)
			sum += digit * 3
		}
	}
	rem := sum % 10
	checkDigit := 0
	if rem != 0 {
		checkDigit = 10 - rem
	}

	return fmt.Sprintf("%s%d", base, checkDigit)
}
