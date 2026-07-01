package http

import (
	"encoding/json"
	"net/http"
)

type StoresHandler struct{}

func NewStoresHandler() *StoresHandler {
	return &StoresHandler{}
}

type StoreFeature struct {
	Type     string `json:"type"`
	Geometry struct {
		Type        string    `json:"type"`
		Coordinates []float64 `json:"coordinates"`
	} `json:"geometry"`
	Properties struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Distance string `json:"distance"`
		Hours    string `json:"hours"`
		Address  string `json:"address"`
		Image    string `json:"image"`
	} `json:"properties"`
}

type StoresResponse struct {
	Type     string         `json:"type"`
	Features []StoreFeature `json:"features"`
}

// GetStores handles GET /api/v1/stores.
// @Summary Get Stores List
// @Description Retrieves a GeoJSON feature collection of physical stores.
// @Tags Stores
// @Produce json
// @Success 200 {object} StoresResponse
// @Router /stores [get]
func (h *StoresHandler) GetStores(w http.ResponseWriter, r *http.Request) {
	stores := StoresResponse{
		Type: "FeatureCollection",
		Features: []StoreFeature{
			{
				Type: "Feature",
				Geometry: struct {
					Type        string    `json:"type"`
					Coordinates []float64 `json:"coordinates"`
				}{Type: "Point", Coordinates: []float64{-122.4324, 37.78825}},
				Properties: struct {
					ID       string `json:"id"`
					Name     string `json:"name"`
					Distance string `json:"distance"`
					Hours    string `json:"hours"`
					Address  string `json:"address"`
					Image    string `json:"image"`
				}{ID: "1", Name: "Sovereign Downtown", Distance: "1.2 km", Hours: "09:00 - 21:00", Address: "123 Main St, Downtown", Image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=400&auto=format&fit=crop"},
			},
			{
				Type: "Feature",
				Geometry: struct {
					Type        string    `json:"type"`
					Coordinates []float64 `json:"coordinates"`
				}{Type: "Point", Coordinates: []float64{-122.4224, 37.79825}},
				Properties: struct {
					ID       string `json:"id"`
					Name     string `json:"name"`
					Distance string `json:"distance"`
					Hours    string `json:"hours"`
					Address  string `json:"address"`
					Image    string `json:"image"`
				}{ID: "2", Name: "Sovereign Uptown", Distance: "3.4 km", Hours: "10:00 - 20:00", Address: "456 High St, Uptown", Image: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=400&auto=format&fit=crop"},
			},
			{
				Type: "Feature",
				Geometry: struct {
					Type        string    `json:"type"`
					Coordinates []float64 `json:"coordinates"`
				}{Type: "Point", Coordinates: []float64{-122.4024, 37.76825}},
				Properties: struct {
					ID       string `json:"id"`
					Name     string `json:"name"`
					Distance string `json:"distance"`
					Hours    string `json:"hours"`
					Address  string `json:"address"`
					Image    string `json:"image"`
				}{ID: "3", Name: "Sovereign Mission", Distance: "5.1 km", Hours: "11:00 - 19:00", Address: "789 Mission St", Image: "https://images.unsplash.com/photo-1580913428706-c311e67898b3?q=80&w=400&auto=format&fit=crop"},
			},
			{
				Type: "Feature",
				Geometry: struct {
					Type        string    `json:"type"`
					Coordinates []float64 `json:"coordinates"`
				}{Type: "Point", Coordinates: []float64{-122.4524, 37.74825}},
				Properties: struct {
					ID       string `json:"id"`
					Name     string `json:"name"`
					Distance string `json:"distance"`
					Hours    string `json:"hours"`
					Address  string `json:"address"`
					Image    string `json:"image"`
				}{ID: "4", Name: "Sovereign West", Distance: "8.0 km", Hours: "08:00 - 22:00", Address: "321 West Ave", Image: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=400&auto=format&fit=crop"},
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stores)
}
