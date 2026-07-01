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
			Timeout: 5 * time.Second,
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
			Title:       "Premium Wireless Noise-Cancelling Headphones",
			Price:       299.99,
			Description: "Experience pure sound with our flagship active noise-cancelling technology.",
			Category:    "electronics",
			Image:       "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
			Barcode:     generateEAN13(1),
		},
		{
			ID:          2,
			Title:       "Sovereign Obsidian Smartwatch",
			Price:       199.50,
			Description: "Stay connected and track your health with our premium obsidian smartwatch.",
			Category:    "electronics",
			Image:       "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop",
			Barcode:     generateEAN13(2),
		},
		{
			ID:          3,
			Title:       "Men's Minimalist Cotton T-Shirt",
			Price:       25.00,
			Description: "A breathable, high-quality organic cotton shirt tailored for a modern fit.",
			Category:    "men's clothing",
			Image:       "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop",
			Barcode:     generateEAN13(3),
		},
		{
			ID:          4,
			Title:       "Classic Leather Weekend Duffle",
			Price:       120.00,
			Description: "Crafted from full-grain leather, perfect for short trips and the gym.",
			Category:    "men's clothing",
			Image:       "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop",
			Barcode:     generateEAN13(4),
		},
		{
			ID:          5,
			Title:       "Women's Winter Wool Coat",
			Price:       150.99,
			Description: "Stay warm and elegant through the coldest months in this premium wool blend.",
			Category:    "women's clothing",
			Image:       "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?q=80&w=600&auto=format&fit=crop",
			Barcode:     generateEAN13(5),
		},
		{
			ID:          6,
			Title:       "18k Gold Plated Chain Necklace",
			Price:       45.00,
			Description: "Subtle, minimalist 18k gold plated chain. Perfect for everyday wear.",
			Category:    "jewel",
			Image:       "https://images.unsplash.com/photo-1599643478524-fb66f7f2b1d6?q=80&w=600&auto=format&fit=crop",
			Barcode:     generateEAN13(6),
		},
		{
			ID:          7,
			Title:       "Professional DSLR Camera Lens",
			Price:       850.00,
			Description: "Capture crystal clear portraits with this professional grade 50mm f/1.4 lens.",
			Category:    "electronics",
			Image:       "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600&auto=format&fit=crop",
			Barcode:     generateEAN13(7),
		},
		{
			ID:          8,
			Title:       "Vintage Aesthetic Sneakers",
			Price:       89.99,
			Description: "Comfort meets retro style in these classic canvas sneakers.",
			Category:    "men's clothing",
			Image:       "https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=600&auto=format&fit=crop",
			Barcode:     generateEAN13(8),
		},
		{
			ID:          9,
			Title:       "Diamond Halo Engagement Ring",
			Price:       2500.00,
			Description: "A breathtaking diamond halo ring set in solid platinum.",
			Category:    "jewel",
			Image:       "https://images.unsplash.com/photo-1605100804763-247f67b2548e?q=80&w=600&auto=format&fit=crop",
			Barcode:     generateEAN13(9),
		},
		{
			ID:          10,
			Title:       "Minimalist Ceramic Coffee Mug",
			Price:       15.50,
			Description: "Enjoy your morning brew in this beautiful handcrafted ceramic mug.",
			Category:    "home",
			Image:       "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=600&auto=format&fit=crop",
			Barcode:     generateEAN13(10),
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
