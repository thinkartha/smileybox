package handlers

import (
	"database/sql"
	"net/http"

	"github.com/supporttickr/backend/internal/middleware"
	"github.com/supporttickr/backend/internal/models"
)

type DashboardHandler struct {
	DB     *sql.DB
	Schema string
}

func (h *DashboardHandler) Stats(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	stats := models.DashboardStats{}

	var whereClause string
	var args []interface{}

	if role == "client" && orgID != "" {
		whereClause = ` WHERE organization_id = $1`
		args = append(args, orgID)
	}

	// Total tickets
	h.DB.QueryRow(`SELECT COUNT(*) FROM `+h.Schema+`.tickets`+whereClause, args...).Scan(&stats.TotalTickets)

	// Status counts
	h.DB.QueryRow(`SELECT COUNT(*) FROM `+h.Schema+`.tickets`+whereClause+h.addAnd(whereClause)+`status = 'open'`, args...).Scan(&stats.OpenTickets)
	h.DB.QueryRow(`SELECT COUNT(*) FROM `+h.Schema+`.tickets`+whereClause+h.addAnd(whereClause)+`status = 'in-progress'`, args...).Scan(&stats.InProgress)
	h.DB.QueryRow(`SELECT COUNT(*) FROM `+h.Schema+`.tickets`+whereClause+h.addAnd(whereClause)+`status = 'resolved'`, args...).Scan(&stats.Resolved)
	h.DB.QueryRow(`SELECT COUNT(*) FROM `+h.Schema+`.tickets`+whereClause+h.addAnd(whereClause)+`status = 'closed'`, args...).Scan(&stats.Closed)

	// Total hours
	var totalHours sql.NullFloat64
	h.DB.QueryRow(`SELECT COALESCE(SUM(hours_worked), 0) FROM `+h.Schema+`.tickets`+whereClause, args...).Scan(&totalHours)
	if totalHours.Valid {
		stats.TotalHours = totalHours.Float64
	}

	// Pending approvals
	if role != "client" {
		h.DB.QueryRow(`SELECT COUNT(*) FROM `+h.Schema+`.conversion_requests WHERE internal_approval = 'pending' OR client_approval = 'pending'`).Scan(&stats.PendingApproval)
	} else if orgID != "" {
		h.DB.QueryRow(
			`SELECT COUNT(*) FROM `+h.Schema+`.conversion_requests cr JOIN `+h.Schema+`.tickets t ON t.id = cr.ticket_id WHERE t.organization_id = $1 AND cr.client_approval = 'pending'`,
			orgID,
		).Scan(&stats.PendingApproval)
	}

	stats.AvgResponseTime = "2.4h"

	writeJSON(w, http.StatusOK, stats)
}

func (h *DashboardHandler) Activities(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var query string
	var rows *sql.Rows
	var err error

	if role == "client" && orgID != "" {
		query = `SELECT a.id, a.type, a.description, a.user_id, a.ticket_id, a.created_at
			FROM ` + h.Schema + `.activities a
			LEFT JOIN ` + h.Schema + `.tickets t ON t.id = a.ticket_id
			WHERE t.organization_id = $1 OR a.ticket_id IS NULL
			ORDER BY a.created_at DESC LIMIT 50`
		rows, err = h.DB.Query(query, orgID)
	} else {
		query = `SELECT id, type, description, user_id, ticket_id, created_at FROM ` + h.Schema + `.activities ORDER BY created_at DESC LIMIT 50`
		rows, err = h.DB.Query(query)
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query activities")
		return
	}
	defer rows.Close()

	var activities []models.ActivityResponse
	for rows.Next() {
		var a models.ActivityItem
		if err := rows.Scan(&a.ID, &a.Type, &a.Description, &a.UserID, &a.TicketID, &a.CreatedAt); err == nil {
			activities = append(activities, a.ToResponse())
		}
	}

	if activities == nil {
		activities = []models.ActivityResponse{}
	}

	writeJSON(w, http.StatusOK, activities)
}

func (h *DashboardHandler) addAnd(where string) string {
	if where != "" {
		return ` AND `
	}
	return ` WHERE `
}
