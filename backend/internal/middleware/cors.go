package middleware

import (
	"net/http"
	"strings"
)

func CORS(frontendURL string) func(http.Handler) http.Handler {
	// Parse allowed origins
	origins := strings.Split(frontendURL, ",")
	allowedOrigins := make(map[string]bool)
	for _, o := range origins {
		allowedOrigins[strings.TrimSpace(o)] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Check if origin is allowed
			if allowedOrigins[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else if allowedOrigins["*"] {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Max-Age", "86400")

			// Handle preflight requests
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
