package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/supporttickr/backend/internal/middleware"
	"github.com/supporttickr/backend/internal/models"
	"github.com/supporttickr/backend/internal/store"
)

type ApprovalHandler struct {
	Store store.Store
}

func (h *ApprovalHandler) List(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	list, err := h.Store.ListConversionRequestsPending(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query approvals: "+err.Error())
		return
	}

	var approvals []models.ConversionRequest
	for _, cr := range list {
		if role == "client" && orgID != "" {
			t, _ := h.Store.GetTicket(r.Context(), cr.TicketID)
			if t == nil || t.OrganizationID != orgID {
				continue
			}
		}
		approvals = append(approvals, cr)
	}
	if approvals == nil {
		approvals = []models.ConversionRequest{}
	}

	writeJSON(w, http.StatusOK, approvals)
}

func (h *ApprovalHandler) Update(w http.ResponseWriter, r *http.Request) {
	crID := r.PathValue("id")
	userID := middleware.GetUserID(r.Context())
	role := middleware.GetRole(r.Context())

	var req models.UpdateApprovalRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Side != "internal" && req.Side != "client" {
		writeError(w, http.StatusBadRequest, "side must be 'internal' or 'client'")
		return
	}
	if req.Status != "approved" && req.Status != "rejected" {
		writeError(w, http.StatusBadRequest, "status must be 'approved' or 'rejected'")
		return
	}

	if req.Side == "internal" && role == "client" {
		writeError(w, http.StatusForbidden, "clients cannot approve internal side")
		return
	}
	if req.Side == "client" && role != "client" && role != "admin" {
		writeError(w, http.StatusForbidden, "only clients or admins can approve client side")
		return
	}

	var internalApproval, clientApproval *string
	if req.Side == "internal" {
		internalApproval = &req.Status
	} else {
		clientApproval = &req.Status
	}

	if err := h.Store.UpdateConversionRequest(r.Context(), crID, internalApproval, clientApproval); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update approval")
		return
	}

	cr, err := h.Store.GetConversionByID(r.Context(), crID)
	if err != nil || cr == nil {
		writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
		return
	}

	if cr.InternalApproval == "approved" && cr.ClientApproval == "approved" {
		_ = h.Store.UpdateTicketCategory(r.Context(), cr.TicketID, cr.ProposedType)
	}

	_ = h.Store.CreateActivity(r.Context(), &models.ActivityItem{
		ID:          "act-" + uuid.NewString()[:8],
		Type:        "conversion-approved",
		Description: fmt.Sprintf("%s %s conversion for %s", req.Side, req.Status, cr.TicketID),
		UserID:      userID,
		TicketID:    &cr.TicketID,
		CreatedAt:   time.Now().UTC(),
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
