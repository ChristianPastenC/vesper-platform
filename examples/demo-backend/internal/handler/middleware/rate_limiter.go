package middleware

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type client struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimiterMiddleware provides rate limiting capabilities by IP.
type RateLimiterMiddleware struct {
	clients     sync.Map
	limit       rate.Limit
	burst       int
	targetPaths []string
}

// NewRateLimiter creates a new RateLimiterMiddleware and starts the cleanup routine.
func NewRateLimiter(r rate.Limit, b int, targetPaths ...string) *RateLimiterMiddleware {
	rl := &RateLimiterMiddleware{
		limit:       r,
		burst:       b,
		targetPaths: targetPaths,
	}

	// Start cleanup routine
	go rl.cleanupInactiveClients()

	return rl
}

// PublicLimiter creates a rate limiter for public endpoints (100 req/min, burst 20)
func PublicLimiter() *RateLimiterMiddleware {
	// 100 requests per minute = 100/60 requests per second
	return NewRateLimiter(rate.Limit(100.0/60.0), 20, "/api/handshake", "/api/v1/auth/login")
}

// ProtectedLimiter creates a rate limiter for protected endpoints (600 req/min, burst 50)
func ProtectedLimiter() *RateLimiterMiddleware {
	// 600 requests per minute = 10 requests per second
	return NewRateLimiter(rate.Limit(600.0/60.0), 50)
}

// cleanupInactiveClients runs every 5 minutes to clean up limiters inactive for > 3 minutes.
func (rl *RateLimiterMiddleware) cleanupInactiveClients() {
	for {
		time.Sleep(5 * time.Minute)
		rl.clients.Range(func(key, value any) bool {
			c := value.(*client)
			if time.Since(c.lastSeen) > 3*time.Minute {
				rl.clients.Delete(key)
			}
			return true
		})
	}
}

func (rl *RateLimiterMiddleware) getClient(ip string) *rate.Limiter {
	v, exists := rl.clients.Load(ip)
	if !exists {
		limiter := rate.NewLimiter(rl.limit, rl.burst)
		rl.clients.Store(ip, &client{limiter: limiter, lastSeen: time.Now()})
		return limiter
	}

	c := v.(*client)
	c.lastSeen = time.Now()
	return c.limiter
}

func (rl *RateLimiterMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// If targetPaths are specified, only apply rate limiting to those paths.
		if len(rl.targetPaths) > 0 {
			matches := false
			for _, p := range rl.targetPaths {
				if strings.HasPrefix(r.URL.Path, p) {
					matches = true
					break
				}
			}
			if !matches {
				next.ServeHTTP(w, r)
				return
			}
		}

		ip := r.Header.Get("X-Real-IP")
		if ip == "" {
			ip = r.RemoteAddr
			// remote addr contains port, remove it
			if colonIdx := strings.LastIndex(ip, ":"); colonIdx != -1 {
				ip = ip[:colonIdx]
			}
		}

		limiter := rl.getClient(ip)
		if !limiter.Allow() {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{
				"error":   "rate_limit_exceeded",
				"message": "Too many requests. Please try again later.",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}
