package http

import (
	"encoding/json"
	"io"
	"log"
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
		log.Printf("profile_handler: failed to fetch user profile: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(getFallbackProfile())
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("profile_handler: failed to read response: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(getFallbackProfile())
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
		log.Printf("profile_handler: failed to parse profile data: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(getFallbackProfile())
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

func getFallbackProfile() map[string]interface{} {
	return map[string]interface{}{
		"id":        1,
		"email":     "john.doe@sovereign-core.internal",
		"username":  "johndoe",
		"firstName": "John",
		"lastName":  "Doe",
		"phone":     "1-570-236-7033",
	}
}
