package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type HandshakeResponse struct {
	Status    string `json:"status"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		if r.Method == "OPTIONS" { w.WriteHeader(204); return }
		next.ServeHTTP(w, r)
	})
}

func handshakeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	resp := HandshakeResponse{
		Status:    "ok",
		Message:   "SovereignCore Backend v1.0 handshake exitoso",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	json.NewEncoder(w).Encode(resp)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintln(w, `{"status":"healthy"}`)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/handshake", handshakeHandler)
	mux.HandleFunc("/health", healthHandler)
	log.Println("[Backend] Escuchando en http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", cors(mux)))
}