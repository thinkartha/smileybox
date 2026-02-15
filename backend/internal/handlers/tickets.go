package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/supporttickr/backend/internal/middleware"
	"github.com/supporttickr/backend/internal/models"
)

type TicketHandler struct {
	DB     *sql.DB
	Schema string
}

func (h *TicketHandler) List(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	q := r.URL.Query()

	query := `SELECT id, title, description, status, priority, category, organization_id, created_by, assigned_to, hours_worked, created_at, updated_at FROM ` + h.Schema + `.tickets WHERE 1=1`
	var args []interface{}
	argIdx := 1

	// Clients can only see their org's tickets
	if role == "client" && orgID != "" {
		query += fmt.Sprintf(` AND organization_id = $%d`, argIdx)
		args = append(args, orgID)
		argIdx++
	}

	if status := q.Get("status"); status != "" {
		query += fmt.Sprintf(` AND status = $%d`, argIdx)
		args = append(args, status)
		argIdx++
	}
	if priority := q.Get("priority"); priority != "" {
		query += fmt.Sprintf(` AND priority = $%d`, argIdx)
		args = append(args, priority)
		argIdx++
	}
	if category := q.Get("category"); category != "" {
		query += fmt.Sprintf(` AND category = $%d`, argIdx)
		args = append(args, category)
		argIdx++
	}
	if filterOrg := q.Get("organizationId"); filterOrg != "" && role != "client" {
		query += fmt.Sprintf(` AND organization_id = $%d`, argIdx)
		args = append(args, filterOrg)
		argIdx++
	}
	if assignedTo := q.Get("assignedTo"); assignedTo != "" {
		query += fmt.Sprintf(` AND assigned_to = $%d`, argIdx)
		args = append(args, assignedTo)
		argIdx++
	}
	if search := q.Get("search"); search != "" {
		query += fmt.Sprintf(` AND (LOWER(title) LIKE $%d OR LOWER(description) LIKE $%d OR LOWER(id) LIKE $%d)`, argIdx, argIdx+1, argIdx+2)
		s := "%" + strings.ToLower(search) + "%"
		args = append(args, s, s, s)
		argIdx += 3
	}

	query += ` ORDER BY created_at DESC`

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query tickets: "+err.Error())
		return
	}
	defer rows.Close()

	var tickets []models.TicketResponse
	for rows.Next() {
		var t models.Ticket
		if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.Category,
			&t.OrganizationID, &t.CreatedBy, &t.AssignedTo, &t.HoursWorked, &t.CreatedAt, &t.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan ticket")
			return
		}
		tickets = append(tickets, t.ToResponse())
	}

	if tickets == nil {
		tickets = []models.TicketResponse{}
	}

	writeJSON(w, http.StatusOK, tickets)
}

func (h *TicketHandler) Get(w http.ResponseWriter, r *http.Request) {
	ticketID := r.PathValue("id")
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var t models.Ticket
	err := h.DB.QueryRow(
		`SELECT id, title, description, status, priority, category, organization_id, created_by, assigned_to, hours_worked, created_at, updated_at FROM `+h.Schema+`.tickets WHERE id = $1`,
		ticketID,
	).Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.Category,
		&t.OrganizationID, &t.CreatedBy, &t.AssignedTo, &t.HoursWorked, &t.CreatedAt, &t.UpdatedAt)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "ticket not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	// Clients can only access their own org tickets
	if role == "client" && t.OrganizationID != orgID {
		writeError(w, http.StatusForbidden, "access denied")
		return
	}

	resp := t.ToResponse()

	// Load messages - hide internal messages from clients
	msgQuery := `SELECT id, ticket_id, user_id, content, is_internal, created_at FROM ` + h.Schema + `.messages WHERE ticket_id = $1`
	if role == "client" {
		msgQuery += ` AND is_internal = false`
	}
	msgQuery += ` ORDER BY created_at ASC`

	msgRows, err := h.DB.Query(msgQuery, ticketID)
	if err == nil {
		defer msgRows.Close()
		for msgRows.Next() {
			var m models.Message
			if err := msgRows.Scan(&m.ID, &m.TicketID, &m.UserID, &m.Content, &m.IsInternal, &m.CreatedAt); err == nil {
				resp.Messages = append(resp.Messages, m)
			}
		}
	}

	// Load time entries
	teRows, err := h.DB.Query(
		`SELECT id, ticket_id, user_id, hours, description, entry_date, created_at FROM `+h.Schema+`.time_entries WHERE ticket_id = $1 ORDER BY entry_date ASC`,
		ticketID,
	)
	if err == nil {
		defer teRows.Close()
		for teRows.Next() {
			var te models.TimeEntry
			if err := teRows.Scan(&te.ID, &te.TicketID, &te.UserID, &te.Hours, &te.Description, &te.Date, &te.CreatedAt); err == nil {
				resp.TimeEntries = append(resp.TimeEntries, te)
			}
		}
	}

	// Load conversion request
	var cr models.ConversionRequest
	err = h.DB.QueryRow(
		`SELECT id, ticket_id, proposed_type, reason, internal_approval, client_approval, proposed_by, created_at FROM `+h.Schema+`.conversion_requests WHERE ticket_id = $1`,
		ticketID,
	).Scan(&cr.ID, &cr.TicketID, &cr.ProposedType, &cr.Reason, &cr.InternalApproval, &cr.ClientApproval, &cr.ProposedBy, &cr.CreatedAt)
	if err == nil {
		resp.ConversionRequest = &cr
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *TicketHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	role := middleware.GetRole(r.Context())

	var req models.CreateTicketRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Title == "" || req.Description == "" {
		writeError(w, http.StatusBadRequest, "title and description are required")
		return
	}

	// For clients, force their org ID
	if role == "client" {
		req.OrganizationID = orgID
	}
	if req.OrganizationID == "" {
		writeError(w, http.StatusBadRequest, "organizationId is required")
		return
	}

	if req.Priority == "" {
		req.Priority = "medium"
	}
	if req.Category == "" {
		req.Category = "support"
	}

	// Generate ticket ID
	var count int
	h.DB.QueryRow(`SELECT COUNT(*) FROM ` + h.Schema + `.tickets`).Scan(&count)
	ticketID := fmt.Sprintf("TKT-%03d", count+1)

	_, err := h.DB.Exec(
		`INSERT INTO `+h.Schema+`.tickets (id, title, description, status, priority, category, organization_id, created_by) VALUES ($1, $2, $3, 'open', $4, $5, $6, $7)`,
		ticketID, req.Title, req.Description, req.Priority, req.Category, req.OrganizationID, userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create ticket: "+err.Error())
		return
	}

	// Log activity
	h.DB.Exec(
		`INSERT INTO `+h.Schema+`.activities (id, type, description, user_id, ticket_id) VALUES ($1, 'ticket-created', $2, $3, $4)`,
		"act-"+uuid.NewString()[:8], "New ticket: "+req.Title, userID, ticketID,
	)

	// Return created ticket
	h.getTicketByID(w, ticketID, role, orgID)
}

func (h *TicketHandler) Update(w http.ResponseWriter, r *http.Request) {
	ticketID := r.PathValue("id")
	userID := middleware.GetUserID(r.Context())
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var req models.UpdateTicketRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Status != nil {
		_, err := h.DB.Exec(
			`UPDATE `+h.Schema+`.tickets SET status = $1 WHERE id = $2`,
			*req.Status, ticketID,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update status")
			return
		}

		actType := "ticket-updated"
		if *req.Status == "resolved" {
			actType = "ticket-resolved"
		}
		h.DB.Exec(
			`INSERT INTO `+h.Schema+`.activities (id, type, description, user_id, ticket_id) VALUES ($1, $2, $3, $4, $5)`,
			"act-"+uuid.NewString()[:8], actType, fmt.Sprintf("Ticket %s status changed to %s", ticketID, *req.Status), userID, ticketID,
		)
	}

	if req.Priority != nil {
		h.DB.Exec(`UPDATE `+h.Schema+`.tickets SET priority = $1 WHERE id = $2`, *req.Priority, ticketID)
	}

	if req.AssignTo != nil {
		if *req.AssignTo == "" {
			h.DB.Exec(`UPDATE `+h.Schema+`.tickets SET assigned_to = NULL WHERE id = $1`, ticketID)
		} else {
			h.DB.Exec(`UPDATE `+h.Schema+`.tickets SET assigned_to = $1 WHERE id = $2`, *req.AssignTo, ticketID)
		}
	}

	h.getTicketByID(w, ticketID, role, orgID)
}

func (h *TicketHandler) AddMessage(w http.ResponseWriter, r *http.Request) {
	ticketID := r.PathValue("id")
	userID := middleware.GetUserID(r.Context())

	var req models.CreateMessageRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Content == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}

	msgID := "msg-" + uuid.NewString()[:8]
	_, err := h.DB.Exec(
		`INSERT INTO `+h.Schema+`.messages (id, ticket_id, user_id, content, is_internal) VALUES ($1, $2, $3, $4, $5)`,
		msgID, ticketID, userID, req.Content, req.IsInternal,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add message")
		return
	}

	// Update ticket updated_at
	h.DB.Exec(`UPDATE `+h.Schema+`.tickets SET updated_at = NOW() WHERE id = $1`, ticketID)

	// Log activity
	h.DB.Exec(
		`INSERT INTO `+h.Schema+`.activities (id, type, description, user_id, ticket_id) VALUES ($1, 'message-added', $2, $3, $4)`,
		"act-"+uuid.NewString()[:8], "New message on "+ticketID, userID, ticketID,
	)

	writeJSON(w, http.StatusCreated, map[string]string{"id": msgID})
}

func (h *TicketHandler) AddTimeEntry(w http.ResponseWriter, r *http.Request) {
	ticketID := r.PathValue("id")
	userID := middleware.GetUserID(r.Context())

	var req models.CreateTimeEntryRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Hours <= 0 {
		writeError(w, http.StatusBadRequest, "hours must be positive")
		return
	}

	teID := "te-" + uuid.NewString()[:8]
	_, err := h.DB.Exec(
		`INSERT INTO `+h.Schema+`.time_entries (id, ticket_id, user_id, hours, description, entry_date) VALUES ($1, $2, $3, $4, $5, $6)`,
		teID, ticketID, userID, req.Hours, req.Description, req.Date,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add time entry")
		return
	}

	// Update hours_worked on ticket
	h.DB.Exec(`UPDATE `+h.Schema+`.tickets SET hours_worked = hours_worked + $1 WHERE id = $2`, req.Hours, ticketID)

	writeJSON(w, http.StatusCreated, map[string]string{"id": teID})
}

func (h *TicketHandler) RequestConversion(w http.ResponseWriter, r *http.Request) {
	ticketID := r.PathValue("id")
	userID := middleware.GetUserID(r.Context())

	var req models.ConversionRequestBody
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ProposedType == "" || req.Reason == "" {
		writeError(w, http.StatusBadRequest, "proposedType and reason are required")
		return
	}

	crID := "cr-" + uuid.NewString()[:8]
	_, err := h.DB.Exec(
		`INSERT INTO `+h.Schema+`.conversion_requests (id, ticket_id, proposed_type, reason, proposed_by) VALUES ($1, $2, $3, $4, $5)`,
		crID, ticketID, req.ProposedType, req.Reason, userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create conversion request: "+err.Error())
		return
	}

	h.DB.Exec(
		`INSERT INTO `+h.Schema+`.activities (id, type, description, user_id, ticket_id) VALUES ($1, 'conversion-requested', $2, $3, $4)`,
		"act-"+uuid.NewString()[:8], fmt.Sprintf("Conversion requested: %s to %s", ticketID, req.ProposedType), userID, ticketID,
	)

	writeJSON(w, http.StatusCreated, map[string]string{"id": crID})
}

// helper to get ticket and write response
func (h *TicketHandler) getTicketByID(w http.ResponseWriter, ticketID, role, orgID string) {
	var t models.Ticket
	err := h.DB.QueryRow(
		`SELECT id, title, description, status, priority, category, organization_id, created_by, assigned_to, hours_worked, created_at, updated_at FROM `+h.Schema+`.tickets WHERE id = $1`,
		ticketID,
	).Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.Category,
		&t.OrganizationID, &t.CreatedBy, &t.AssignedTo, &t.HoursWorked, &t.CreatedAt, &t.UpdatedAt)

	if err != nil {
		writeError(w, http.StatusNotFound, "ticket not found")
		return
	}

	resp := t.ToResponse()
	writeJSON(w, http.StatusOK, resp)
}
