package routes

import (
	"database/sql"
	"net/http"

	"github.com/supporttickr/backend/internal/config"
	"github.com/supporttickr/backend/internal/handlers"
	"github.com/supporttickr/backend/internal/middleware"
)

func Setup(db *sql.DB, cfg *config.Config) http.Handler {
	mux := http.NewServeMux()

	schema := cfg.DBSchema

	// Initialize handlers
	authH := &handlers.AuthHandler{DB: db, JWTSecret: cfg.JWTSecret, Schema: schema}
	ticketH := &handlers.TicketHandler{DB: db, Schema: schema}
	orgH := &handlers.OrgHandler{DB: db, Schema: schema}
	userH := &handlers.UserHandler{DB: db, Schema: schema}
	approvalH := &handlers.ApprovalHandler{DB: db, Schema: schema}
	invoiceH := &handlers.InvoiceHandler{DB: db, Schema: schema}
	dashboardH := &handlers.DashboardHandler{DB: db, Schema: schema}

	// Auth middleware
	authMW := middleware.Auth(cfg.JWTSecret)

	// Public routes
	mux.HandleFunc("POST /api/auth/login", authH.Login)

	// Health check
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Protected routes - wrap with auth middleware
	// Auth
	mux.Handle("GET /api/auth/me", authMW(http.HandlerFunc(authH.Me)))

	// Users
	mux.Handle("GET /api/users", authMW(http.HandlerFunc(userH.List)))
	mux.Handle("GET /api/users/{id}", authMW(http.HandlerFunc(userH.Get)))
	mux.Handle("POST /api/users", authMW(http.HandlerFunc(userH.Create)))
	mux.Handle("PUT /api/users/{id}", authMW(http.HandlerFunc(userH.Update)))
	mux.Handle("DELETE /api/users/{id}", authMW(http.HandlerFunc(userH.Delete)))

	// Organizations
	mux.Handle("GET /api/organizations", authMW(http.HandlerFunc(orgH.List)))
	mux.Handle("GET /api/organizations/{id}", authMW(http.HandlerFunc(orgH.Get)))
	mux.Handle("POST /api/organizations", authMW(http.HandlerFunc(orgH.Create)))
	mux.Handle("PUT /api/organizations/{id}", authMW(http.HandlerFunc(orgH.Update)))
	mux.Handle("DELETE /api/organizations/{id}", authMW(http.HandlerFunc(orgH.Delete)))

	// Tickets
	mux.Handle("GET /api/tickets", authMW(http.HandlerFunc(ticketH.List)))
	mux.Handle("GET /api/tickets/{id}", authMW(http.HandlerFunc(ticketH.Get)))
	mux.Handle("POST /api/tickets", authMW(http.HandlerFunc(ticketH.Create)))
	mux.Handle("PUT /api/tickets/{id}", authMW(http.HandlerFunc(ticketH.Update)))
	mux.Handle("POST /api/tickets/{id}/messages", authMW(http.HandlerFunc(ticketH.AddMessage)))
	mux.Handle("POST /api/tickets/{id}/time-entries", authMW(http.HandlerFunc(ticketH.AddTimeEntry)))
	mux.Handle("POST /api/tickets/{id}/convert", authMW(http.HandlerFunc(ticketH.RequestConversion)))

	// Approvals
	mux.Handle("GET /api/approvals", authMW(http.HandlerFunc(approvalH.List)))
	mux.Handle("PUT /api/approvals/{id}", authMW(http.HandlerFunc(approvalH.Update)))

	// Invoices
	mux.Handle("GET /api/invoices", authMW(http.HandlerFunc(invoiceH.List)))
	mux.Handle("POST /api/invoices", authMW(http.HandlerFunc(invoiceH.Create)))
	mux.Handle("PUT /api/invoices/{id}", authMW(http.HandlerFunc(invoiceH.UpdateStatus)))

	// Dashboard
	mux.Handle("GET /api/dashboard/stats", authMW(http.HandlerFunc(dashboardH.Stats)))
	mux.Handle("GET /api/dashboard/activities", authMW(http.HandlerFunc(dashboardH.Activities)))

	// Apply CORS middleware
	corsHandler := middleware.CORS(cfg.FrontendURL)(mux)

	return corsHandler
}
