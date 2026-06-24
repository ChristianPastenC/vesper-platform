package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"os"
)

// HashValidator intercepta las peticiones, lee el cuerpo y valida la integridad del payload
// comparando el HMAC-SHA256 recalculado contra el header X-Sovereign-Hash.
func HashValidator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Ignoramos la validación para métodos que no deberían contener body
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		clientHashHex := r.Header.Get("X-Sovereign-Hash")
		if clientHashHex == "" {
			http.Error(w, "Forbidden: Missing X-Sovereign-Hash header", http.StatusForbidden)
			return
		}

		clientHash, err := hex.DecodeString(clientHashHex)
		if err != nil {
			http.Error(w, "Forbidden: Invalid X-Sovereign-Hash format", http.StatusForbidden)
			return
		}

		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Internal Server Error: Unable to read request body", http.StatusInternalServerError)
			return
		}
		
		// Restauramos el body para que el resto de los handlers/middlewares puedan leerlo
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		secretKey := os.Getenv("PAYLOAD_SECRET_KEY")
		if secretKey == "" {
			// En un entorno de producción, esto debería registrarse (log) y bloquear la petición
			http.Error(w, "Internal Server Error: Missing PAYLOAD_SECRET_KEY", http.StatusInternalServerError)
			return
		}

		// Calculamos el HMAC-SHA256 del payload
		mac := hmac.New(sha256.New, []byte(secretKey))
		mac.Write(bodyBytes)
		expectedHash := mac.Sum(nil)

		// Comparamos usando hmac.Equal para evitar ataques de timing
		if !hmac.Equal(clientHash, expectedHash) {
			http.Error(w, "Forbidden: Payload integrity verification failed", http.StatusForbidden)
			return
		}

		// Continuamos con el siguiente handler si la validación es exitosa
		next.ServeHTTP(w, r)
	})
}
