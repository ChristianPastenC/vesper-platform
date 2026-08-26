package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"vesper-core/demo-backend/internal/domain"
)

func TestFakeStoreGateway_GetProducts(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Query().Get("limit") == "2" {
				w.WriteHeader(http.StatusOK)
				products := []FakeStoreProduct{
					{ID: 1, Title: "P1", Category: "cat1"},
					{ID: 2, Title: "P2", Category: "cat1"},
				}
				json.NewEncoder(w).Encode(products)
				return
			}
			w.WriteHeader(http.StatusBadRequest)
		}))
		defer ts.Close()

		gw := NewFakeStoreGateway()
		gw.baseURL = ts.URL

		ctx := context.Background()
		products, err := gw.GetProducts(ctx, domain.CatalogQuery{Limit: 2})
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if len(products) != 2 {
			t.Fatalf("expected 2 products, got %d", len(products))
		}
		if products[0].Barcode == "" {
			t.Errorf("expected barcode to be generated")
		}
	})

	t.Run("server error", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer ts.Close()

		gw := NewFakeStoreGateway()
		gw.baseURL = ts.URL

		ctx := context.Background()
		products, err := gw.GetProducts(ctx, domain.CatalogQuery{})
		if err != nil {
			t.Fatalf("expected no error (fallback), got %v", err)
		}
		if len(products) == 0 {
			t.Fatalf("expected fallback products, got empty")
		}
	})

	t.Run("invalid json", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{bad_json}`))
		}))
		defer ts.Close()

		gw := NewFakeStoreGateway()
		gw.baseURL = ts.URL

		ctx := context.Background()
		products, err := gw.GetProducts(ctx, domain.CatalogQuery{})
		if err != nil {
			t.Fatalf("expected no error (fallback), got %v", err)
		}
		if len(products) == 0 {
			t.Fatalf("expected fallback products, got empty")
		}
	})

	t.Run("category routing", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/category/jewelery" {
				t.Errorf("expected path /category/jewelery, got %s", r.URL.Path)
			}
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]FakeStoreProduct{})
		}))
		defer ts.Close()

		gw := NewFakeStoreGateway()
		gw.baseURL = ts.URL

		ctx := context.Background()
		gw.GetProducts(ctx, domain.CatalogQuery{Category: "jewelery"})
	})

	t.Run("network timeout", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// To avoid the test hanging for 4 seconds, we will pass a context with a short timeout to GetProducts
			time.Sleep(100 * time.Millisecond)
		}))
		defer ts.Close()

		gw := NewFakeStoreGateway()
		gw.baseURL = ts.URL

		// We cancel earlier to simulate the internal 4s timeout without actually waiting 4s in unit tests
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
		defer cancel()

		products, err := gw.GetProducts(ctx, domain.CatalogQuery{})
		if err != nil {
			t.Fatalf("expected no error (fallback), got %v", err)
		}
		if len(products) == 0 {
			t.Fatalf("expected fallback products, got empty")
		}
	})
}
