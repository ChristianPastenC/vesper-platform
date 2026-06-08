package http

import (
	"net/http"
	"strconv"

	"sovereign-core/backend-api/internal/domain"
	"sovereign-core/backend-api/internal/usecase"
)

// CatalogHandler handles catalog fetching requests.
type CatalogHandler struct {
	interactor *usecase.CatalogInteractor
}

// NewCatalogHandler initializes a CatalogHandler.
func NewCatalogHandler(interactor *usecase.CatalogInteractor) *CatalogHandler {
	return &CatalogHandler{
		interactor: interactor,
	}
}

// GetCatalog handles GET /api/v1/catalog. It extracts query parameters for limit
// and category, calls the interactor to fetch products, and writes the JSON response.
func (h *CatalogHandler) GetCatalog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET requests are allowed on this endpoint")
		return
	}

	category := r.URL.Query().Get("category")
	limitStr := r.URL.Query().Get("limit")
	limit := 0
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	query := domain.CatalogQuery{
		Category: category,
		Limit:    limit,
	}

	products, err := h.interactor.ExecuteCatalogQuery(r.Context(), query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed_to_retrieve_catalog", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, products)
}
