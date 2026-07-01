package http

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"sovereign-core/backend-api/internal/challenge"
	"sovereign-core/backend-api/internal/domain"
	"sovereign-core/backend-api/internal/handler/middleware"
	oldhandlers "sovereign-core/backend-api/internal/handlers"
)

// RouterConfig gathers dependencies required to spin up the HTTP router.
type RouterConfig struct {
	Log             *slog.Logger
	ChallengeIssuer *challenge.Issuer
	TokenService    domain.TokenService
	AuthHandler     *AuthHandler
	CatalogHandler  *CatalogHandler
	PaymentHandler  *PaymentHandler
	ProfileHandler  *ProfileHandler
	OrdersHandler      *OrdersHandler
	StoresHandler      *StoresHandler
	IdempotencyManager *middleware.IdempotencyManager
}

// NewRouter constructs a configured chi.Mux handler with security interceptors.
func NewRouter(cfg RouterConfig) http.Handler {
	r := chi.NewRouter()

	// 1. Basic request instrumentation
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	// Rate limiter for public routes (must be before CORS)
	publicLimiter := middleware.PublicLimiter()
	r.Use(publicLimiter.Middleware)

	// 2. Global CORS configuration allowing Authorization and DPoP headers
	r.Use(middleware.CORS(middleware.DefaultCORSConfig()))

	// 3. Infrastructure and Legacy Compatibility routes
	r.HandleFunc("/health", oldhandlers.HealthHandler())
	r.HandleFunc("/api/handshake", oldhandlers.HandshakeHandler(cfg.ChallengeIssuer, cfg.Log))

	// 4. API v1 Group
	r.Route("/api/v1", func(r chi.Router) {
		// Public Login
		r.Post("/auth/login", cfg.AuthHandler.Login)

		// Public Refresh
		r.Post("/auth/refresh", cfg.AuthHandler.Refresh)

		// Public Catalog (ESB orchestrator for Fakestore API)
		r.Get("/catalog", cfg.CatalogHandler.GetCatalog)

		// Public Stores
		if cfg.StoresHandler != nil {
			r.Get("/stores", cfg.StoresHandler.GetStores)
		}

		// Protected Checkout Route (JWT + DPoP validation)
		r.Group(func(r chi.Router) {
			dpopValidator := middleware.NewDPoPValidator()
			protectedLimiter := middleware.ProtectedLimiter()

			// First validate the JWT token validity
			r.Use(middleware.JWTAuth(cfg.TokenService))
			// Apply protected rate limiting
			r.Use(protectedLimiter.Middleware)
			// Then validate client signature on DPoP header
			r.Use(dpopValidator.Middleware)
			// Apply idempotency interceptor
			if cfg.IdempotencyManager != nil {
				r.Use(cfg.IdempotencyManager.Middleware)
			}
			// Validate payload integrity via HMAC-SHA256
			r.Use(middleware.HashValidator)

			r.Post("/checkout/pay", cfg.PaymentHandler.ProcessPayment)
			r.Post("/checkout/sync", cfg.PaymentHandler.SyncOfflinePayments)
			r.Post("/checkout/online", cfg.PaymentHandler.ProcessPayment)
			r.Post("/checkout/instore", cfg.PaymentHandler.ProcessPayment)

			if cfg.ProfileHandler != nil {
				r.Get("/profile/me", cfg.ProfileHandler.GetProfile)
			}

			if cfg.OrdersHandler != nil {
				r.Get("/orders", cfg.OrdersHandler.GetOrders)
				r.Get("/orders/{id}", cfg.OrdersHandler.GetOrder)
			}
		})
	})

	return r
}
