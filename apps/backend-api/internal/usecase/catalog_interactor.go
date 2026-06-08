package usecase

import (
	"context"
	"strings"

	"sovereign-core/backend-api/internal/domain"
)

// CatalogInteractor coordinates product catalog operations.
type CatalogInteractor struct {
	gateway domain.ProductGateway
}

// NewCatalogInteractor instantiates a CatalogInteractor with a ProductGateway.
func NewCatalogInteractor(gw domain.ProductGateway) *CatalogInteractor {
	return &CatalogInteractor{
		gateway: gw,
	}
}

// ExecuteCatalogQuery executes the product retrieval logic and enriches output
// image URLs with premium high-resolution placeholders depending on the product's category.
func (c *CatalogInteractor) ExecuteCatalogQuery(ctx context.Context, query domain.CatalogQuery) ([]domain.Product, error) {
	products, err := c.gateway.GetProducts(ctx, query)
	if err != nil {
		return nil, err
	}

	// Enrich image URLs with beautiful, high-res placeholders to satisfy rich aesthetics.
	for i := range products {
		category := strings.ToLower(products[i].Category)
		switch {
		case strings.Contains(category, "electronics"):
			products[i].Image = "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=600&auto=format&fit=crop"
		case strings.Contains(category, "jewel"):
			products[i].Image = "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=600&auto=format&fit=crop"
		case strings.Contains(category, "men's clothing"):
			products[i].Image = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600&auto=format&fit=crop"
		case strings.Contains(category, "women's clothing"):
			products[i].Image = "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=600&auto=format&fit=crop"
		default:
			products[i].Image = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop"
		}
	}

	return products, nil
}
