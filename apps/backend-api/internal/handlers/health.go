// Package handlers — health endpoint.
package handlers

import (
	"fmt"
	"net/http"
	"time"
)

// HealthHandler returns a minimal liveness probe suitable for load balancers
// and container orchestration health checks. It intentionally avoids JSON
// serialisation overhead for maximum throughput.
func HealthHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, `{"error":"method_not_allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"healthy","server_time":%q}`, time.Now().UTC().Format(time.RFC3339))
	}
}
