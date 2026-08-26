package usecase_test

import (
	"context"
	"errors"
	"testing"

	"vesper-core/demo-backend/internal/domain"
	"vesper-core/demo-backend/internal/usecase"
)

type mockGateway struct {
	products []domain.Product
	err      error
}

func (m *mockGateway) GetProducts(ctx context.Context, query domain.CatalogQuery) ([]domain.Product, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.products, nil
}

func TestCatalogInteractor_ExecuteCatalogQuery(t *testing.T) {
	ctx := context.Background()

	t.Run("success with mapped images", func(t *testing.T) {
		gw := &mockGateway{
			products: []domain.Product{
				{Category: "Electronics"},
				{Category: "Jewelery"},
				{Category: "Men's clothing"},
				{Category: "Women's clothing"},
				{Category: "Other"},
			},
		}

		interactor := usecase.NewCatalogInteractor(gw)

		res, err := interactor.ExecuteCatalogQuery(ctx, domain.CatalogQuery{})
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if len(res) != 5 {
			t.Fatalf("expected 5 products, got %d", len(res))
		}

		// Ensure that images were populated
		for i, p := range res {
			if p.Image == "" {
				t.Errorf("product at index %d has empty image", i)
			}
		}
	})

	t.Run("gateway error", func(t *testing.T) {
		gw := &mockGateway{err: errors.New("network error")}
		interactor := usecase.NewCatalogInteractor(gw)

		_, err := interactor.ExecuteCatalogQuery(ctx, domain.CatalogQuery{})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}
