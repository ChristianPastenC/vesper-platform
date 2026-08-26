package http

import (
	"encoding/json"
	"net/http"

	"sovereign-core/backend-api/internal/domain"
	"sovereign-core/backend-api/internal/handler/middleware"
)

type ProfileHandler struct {
	userRepo domain.AuthRepository
}

func NewProfileHandler(userRepo domain.AuthRepository) *ProfileHandler {
	return &ProfileHandler{userRepo: userRepo}
}

// GetProfile handles GET /api/v1/profile/me.
// @Summary Get User Profile
// @Description Returns the profile details of the authenticated user.
// @Tags Profile
// @Produce json
// @Security BearerAuth
// @Success 200 {object} domain.User
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /profile/me [get]
func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "User identity missing from context")
		return
	}

	user, err := h.userRepo.GetUserByID(r.Context(), userID)
	if err != nil {
		if err.Error() == "user_repository: user not found" {
			writeError(w, http.StatusNotFound, "not_found", "User not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to retrieve user profile")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// UpdateProfile handles PUT /api/v1/profile/me.
// @Summary Update User Profile
// @Description Updates the profile details of the authenticated user.
// @Tags Profile
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body domain.UserUpdate true "User Update Details"
// @Success 200 {object} domain.User
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /profile/me [put]
func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "User identity missing from context")
		return
	}

	var updates domain.UserUpdate
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse JSON body or payload too large")
		return
	}

	// Make sure body isn't totally empty of updates if needed, though omitempty covers it.
	user, err := h.userRepo.UpdateUser(r.Context(), userID, updates)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, user)
}
