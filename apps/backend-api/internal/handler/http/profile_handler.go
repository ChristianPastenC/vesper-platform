package http

import (
	"encoding/json"
	"io"
	"net/http"
	"time"
)

type ProfileHandler struct{}

func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{}
}

func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("https://fakestoreapi.com/users/1")
	if err != nil || resp.StatusCode != http.StatusOK {
		http.Error(w, "failed to fetch user profile", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "failed to read response", http.StatusInternalServerError)
		return
	}

	var fakeStoreUser struct {
		ID       int    `json:"id"`
		Email    string `json:"email"`
		Username string `json:"username"`
		Name     struct {
			Firstname string `json:"firstname"`
			Lastname  string `json:"lastname"`
		} `json:"name"`
		Phone string `json:"phone"`
	}

	if err := json.Unmarshal(body, &fakeStoreUser); err != nil {
		http.Error(w, "failed to parse profile data", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"id":        fakeStoreUser.ID,
		"email":     fakeStoreUser.Email,
		"username":  fakeStoreUser.Username,
		"firstName": fakeStoreUser.Name.Firstname,
		"lastName":  fakeStoreUser.Name.Lastname,
		"phone":     fakeStoreUser.Phone,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
