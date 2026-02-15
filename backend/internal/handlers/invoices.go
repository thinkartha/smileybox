package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/supporttickr/backend/internal/middleware"
	"github.com/supporttickr/backend/internal/models"
)

type InvoiceHandler struct {
	DB     *sql.DB
	Schema string
}

func (h *InvoiceHandler) List(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	query := `SELECT id, organization_id, month, year, tickets_closed, total_hours, rate_per_hour, total_amount, status, created_at FROM ` + h.Schema + `.invoices`

	var rows *sql.Rows
	var err error

	if role == "client" && orgID != "" {
		query += ` WHERE organization_id = $1 ORDER BY year DESC, month DESC`
		rows, err = h.DB.Query(query, orgID)
	} else {
		query += ` ORDER BY year DESC, month DESC`
		rows, err = h.DB.Query(query)
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query invoices")
		return
	}
	defer rows.Close()

	var invoices []models.Invoice
	for rows.Next() {
		var inv models.Invoice
		if err := rows.Scan(&inv.ID, &inv.OrganizationID, &inv.Month, &inv.Year, &inv.TicketsClosed,
			&inv.TotalHours, &inv.RatePerHour, &inv.TotalAmount, &inv.Status, &inv.CreatedAt); err == nil {
			invoices = append(invoices, inv)
		}
	}

	if invoices == nil {
		invoices = []models.Invoice{}
	}

	writeJSON(w, http.StatusOK, invoices)
}

func (h *InvoiceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateInvoiceRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Generate invoice ID
	var count int
	h.DB.QueryRow(`SELECT COUNT(*) FROM ` + h.Schema + `.invoices`).Scan(&count)
	invID := fmt.Sprintf("INV-%d-%03d", req.Year, count+1)

	_, err := h.DB.Exec(
		`INSERT INTO `+h.Schema+`.invoices (id, organization_id, month, year, tickets_closed, total_hours, rate_per_hour, total_amount, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')`,
		invID, req.OrganizationID, req.Month, req.Year, req.TicketsClosed, req.TotalHours, req.RatePerHour, req.TotalAmount,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create invoice: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": invID})
}

func (h *InvoiceHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	invID := r.PathValue("id")

	var req models.UpdateInvoiceStatusRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Status != "draft" && req.Status != "sent" && req.Status != "paid" {
		writeError(w, http.StatusBadRequest, "status must be draft, sent, or paid")
		return
	}

	_, err := h.DB.Exec(
		`UPDATE `+h.Schema+`.invoices SET status = $1 WHERE id = $2`,
		req.Status, invID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update invoice status")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
