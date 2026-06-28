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
	} `json:"properties"`
}

type StoresResponse struct {
	Type     string         `json:"type"`
	Features []StoreFeature `json:"features"`
}

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
				}{ID: "1", Name: "Sovereign Downtown", Distance: "1.2 km", Hours: "09:00 - 21:00", Address: "123 Main St, Downtown"},
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
				}{ID: "2", Name: "Sovereign Uptown", Distance: "3.4 km", Hours: "10:00 - 20:00", Address: "456 High St, Uptown"},
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
				}{ID: "3", Name: "Sovereign Mission", Distance: "5.1 km", Hours: "11:00 - 19:00", Address: "789 Mission St"},
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
				}{ID: "4", Name: "Sovereign West", Distance: "8.0 km", Hours: "08:00 - 22:00", Address: "321 West Ave"},
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stores)
}
