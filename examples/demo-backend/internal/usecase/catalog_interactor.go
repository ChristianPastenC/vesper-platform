package usecase

import (
	"context"
	"strings"
	"sync"

	"vesper-core/demo-backend/internal/domain"
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

	// Varied premium images for each category
	electronicsImages := []string{
		"https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=600&auto=format&fit=crop", // Electronics
		"https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=600&auto=format&fit=crop", // Tech desk
		"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop", // Headphones
		"https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=600&auto=format&fit=crop", // Smartwatch
		"https://images.unsplash.com/photo-1550009158-9ebf6d1736de?q=80&w=600&auto=format&fit=crop", // iPhone
	}

	jewelImages := []string{
		"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=600&auto=format&fit=crop", // Rings
		"https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=600&auto=format&fit=crop", // Gold necklace
		"https://images.unsplash.com/photo-1599643478514-4a4209224422?q=80&w=600&auto=format&fit=crop", // Diamond ring
		"https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=600&auto=format&fit=crop", // Various jewelry
	}

	mensImages := []string{
		"https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600&auto=format&fit=crop", // Suit/shirt
		"https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=600&auto=format&fit=crop", // Casual
		"https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop", // Hoodie
		"https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=600&auto=format&fit=crop", // Men's fashion
		"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop", // T-shirt
	}

	womensImages := []string{
		"https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=600&auto=format&fit=crop", // Woman with bags
		"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop", // Fashion model
		"https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=600&auto=format&fit=crop", // Dress
		"https://images.unsplash.com/photo-1434389670869-c45d430ba705?q=80&w=600&auto=format&fit=crop", // Denim
		"https://images.unsplash.com/photo-1550614000-4b95d466f271?q=80&w=600&auto=format&fit=crop", // Fashion
	}

	fallbackImages := []string{
		"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
		"https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=600&auto=format&fit=crop",
	}

	// Enrich metadata concurrently utilizing the Scatter-Gather pattern to maximize throughput
	// and prevent thread-blocking on large upstream catalog arrays.
	var wg sync.WaitGroup

	for i := range products {
		wg.Add(1)

		// Spawn a lightweight Goroutine per item to execute the mapping logic in parallel
		go func(index int) {
			defer wg.Done()
			
			productID := products[index].ID
			category := strings.ToLower(products[index].Category)
			
			switch {
			case strings.Contains(category, "electronics"):
				products[index].Image = electronicsImages[productID%len(electronicsImages)]
			case strings.Contains(category, "jewel"):
				products[index].Image = jewelImages[productID%len(jewelImages)]
			case strings.Contains(category, "men's clothing"):
				products[index].Image = mensImages[productID%len(mensImages)]
			case strings.Contains(category, "women's clothing"):
				products[index].Image = womensImages[productID%len(womensImages)]
			default:
				products[index].Image = fallbackImages[productID%len(fallbackImages)]
			}
		}(i)
	}

	// Block the primary thread until all concurrent scatter operations converge
	wg.Wait()

	return products, nil
}
