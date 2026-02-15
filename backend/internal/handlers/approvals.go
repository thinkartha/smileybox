package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/supporttickr/backend/internal/middleware"
	"github.com/supporttickr/backend/internal/models"
)

type ApprovalHandler struct {
	DB     *sql.DB
	Schema string
}

func (h *ApprovalHandler) List(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	query := `SELECT cr.id, cr.ticket_id, cr.proposed_type, cr.reason, cr.internal_approval, cr.client_approval, cr.proposed_by, cr.created_at
		FROM ` + h.Schema + `.conversion_requests cr
		JOIN ` + h.Schema + `.tickets t ON t.id = cr.ticket_id`

	var rows *sql.Rows
	var err error

	if role == "client" && orgID != "" {
		query += ` WHERE t.organization_id = $1 ORDER BY cr.created_at DESC`
		rows, err = h.DB.Query(query, orgID)
	} else {
		query += ` ORDER BY cr.created_at DESC`
		rows, err = h.DB.Query(query)
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query approvals: "+err.Error())
		return
	}
	defer rows.Close()

	var approvals []models.ConversionRequest
	for rows.Next() {
		var cr models.ConversionRequest
		if err := rows.Scan(&cr.ID, &cr.TicketID, &cr.ProposedType, &cr.Reason, &cr.InternalApproval, &cr.ClientApproval, &cr.ProposedBy, &cr.CreatedAt); err == nil {
			approvals = append(approvals, cr)
		}
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

	// Validate permission: internal users approve internal side, clients approve client side
	if req.Side == "internal" && role == "client" {
		writeError(w, http.StatusForbidden, "clients cannot approve internal side")
		return
	}
	if req.Side == "client" && role != "client" && role != "admin" {
		writeError(w, http.StatusForbidden, "only clients or admins can approve client side")
		return
	}

	var column string
	if req.Side == "internal" {
		column = "internal_approval"
	} else {
		column = "client_approval"
	}

	_, err := h.DB.Exec(
		fmt.Sprintf(`UPDATE %s.conversion_requests SET %s = $1 WHERE id = $2`, h.Schema, column),
		req.Status, crID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update approval")
		return
	}

	// Check if both sides are now approved - if so, update ticket category
	var cr models.ConversionRequest
	err = h.DB.QueryRow(
		`SELECT id, ticket_id, proposed_type, internal_approval, client_approval FROM `+h.Schema+`.conversion_requests WHERE id = $1`,
		crID,
	).Scan(&cr.ID, &cr.TicketID, &cr.ProposedType, &cr.InternalApproval, &cr.ClientApproval)

	if err == nil && cr.InternalApproval == "approved" && cr.ClientApproval == "approved" {
		h.DB.Exec(`UPDATE `+h.Schema+`.tickets SET category = $1 WHERE id = $2`, cr.ProposedType, cr.TicketID)
	}

	// Log activity
	h.DB.Exec(
		`INSERT INTO `+h.Schema+`.activities (id, type, description, user_id, ticket_id) VALUES ($1, 'conversion-approved', $2, $3, $4)`,
		"act-"+uuid.NewString()[:8],
		fmt.Sprintf("%s %s conversion for %s", req.Side, req.Status, cr.TicketID),
		userID, cr.TicketID,
	)

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
