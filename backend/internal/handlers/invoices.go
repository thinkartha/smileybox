package handlers

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/supporttickr/backend/internal/middleware"
	"github.com/supporttickr/backend/internal/models"
	"github.com/supporttickr/backend/internal/store"
)

type InvoiceHandler struct {
	Store store.Store
}

func (h *InvoiceHandler) List(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	invoices, err := h.Store.ListInvoices(r.Context(), role, orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query invoices")
		return
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

	invID := "inv-" + uuid.NewString()[:8]
	now := time.Now().UTC()

	inv := &models.Invoice{
		ID:             invID,
		OrganizationID: req.OrganizationID,
		Month:          req.Month,
		Year:           req.Year,
		TicketsClosed:  req.TicketsClosed,
		TotalHours:     req.TotalHours,
		RatePerHour:    req.RatePerHour,
		TotalAmount:    req.TotalAmount,
		Status:         "draft",
		CreatedAt:      now,
	}
	if err := h.Store.CreateInvoice(r.Context(), inv); err != nil {
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

	if err := h.Store.UpdateInvoiceStatus(r.Context(), invID, req.Status); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update invoice status")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
