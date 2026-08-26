package http_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"vesper-core/demo-backend/internal/domain"
	apiHTTP "vesper-core/demo-backend/internal/handler/http"
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

func TestCatalogHandler_GetCatalog(t *testing.T) {
	gw := &mockGateway{
		products: []domain.Product{
			{Category: "Electronics"},
		},
	}
	interactor := usecase.NewCatalogInteractor(gw)
	handler := apiHTTP.NewCatalogHandler(interactor)

	t.Run("success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/catalog?category=Electronics&limit=10", nil)
		w := httptest.NewRecorder()

		handler.GetCatalog(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}

		var res []domain.Product
		json.Unmarshal(w.Body.Bytes(), &res)
		if len(res) != 1 {
			t.Errorf("expected 1 product, got %d", len(res))
		}
	})

	t.Run("wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/catalog", nil)
		w := httptest.NewRecorder()

		handler.GetCatalog(w, req)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected 405, got %d", w.Code)
		}
	})

	t.Run("interactor error", func(t *testing.T) {
		gw.err = errors.New("backend error")
		req := httptest.NewRequest(http.MethodGet, "/api/v1/catalog", nil)
		w := httptest.NewRecorder()

		handler.GetCatalog(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Errorf("expected 500, got %d", w.Code)
		}
		gw.err = nil
	})
}
