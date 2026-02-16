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

type TicketHandler struct {
	Store store.Store
}

func (h *TicketHandler) List(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	q := r.URL.Query()

	status := q.Get("status")
	priority := q.Get("priority")
	category := q.Get("category")
	organizationID := q.Get("organizationId")
	assignedTo := q.Get("assignedTo")
	search := q.Get("search")

	if role == "client" && orgID != "" {
		organizationID = orgID
	}

	tickets, err := h.Store.ListTickets(r.Context(), status, priority, category, organizationID, assignedTo, search)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query tickets: "+err.Error())
		return
	}

	var out []models.TicketResponse
	for _, t := range tickets {
		out = append(out, t.ToResponse())
	}
	if out == nil {
		out = []models.TicketResponse{}
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *TicketHandler) Get(w http.ResponseWriter, r *http.Request) {
	ticketID := r.PathValue("id")
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	t, err := h.Store.GetTicket(r.Context(), ticketID)
	if err != nil || t == nil {
		writeError(w, http.StatusNotFound, "ticket not found")
		return
	}

	if role == "client" && t.OrganizationID != orgID {
		writeError(w, http.StatusForbidden, "access denied")
		return
	}

	resp := t.ToResponse()

	messages, _ := h.Store.GetMessagesByTicketID(r.Context(), ticketID)
	for _, m := range messages {
		if role == "client" && m.IsInternal {
			continue
		}
		resp.Messages = append(resp.Messages, m)
	}

	timeEntries, _ := h.Store.GetTimeEntriesByTicketID(r.Context(), ticketID)
	resp.TimeEntries = timeEntries

	cr, _ := h.Store.GetConversionByTicketID(r.Context(), ticketID)
	if cr != nil {
		resp.ConversionRequest = cr
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

	now := time.Now().UTC()
	ticketID := "tkt-" + uuid.NewString()[:8]

	t := &models.Ticket{
		ID:             ticketID,
		Title:          req.Title,
		Description:    req.Description,
		Status:         "open",
		Priority:       req.Priority,
		Category:       req.Category,
		OrganizationID: req.OrganizationID,
		CreatedBy:      userID,
		HoursWorked:    0,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := h.Store.CreateTicket(r.Context(), t); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create ticket: "+err.Error())
		return
	}

	_ = h.Store.CreateActivity(r.Context(), &models.ActivityItem{
		ID:          "act-" + uuid.NewString()[:8],
		Type:        "ticket-created",
		Description: "New ticket: " + req.Title,
		UserID:      userID,
		TicketID:    &ticketID,
		CreatedAt:   now,
	})

	resp := t.ToResponse()
	writeJSON(w, http.StatusCreated, resp)
}

func (h *TicketHandler) Update(w http.ResponseWriter, r *http.Request) {
	ticketID := r.PathValue("id")
	userID := middleware.GetUserID(r.Context())
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	t, err := h.Store.GetTicket(r.Context(), ticketID)
	if err != nil || t == nil {
		writeError(w, http.StatusNotFound, "ticket not found")
		return
	}
	if role == "client" && t.OrganizationID != orgID {
		writeError(w, http.StatusForbidden, "access denied")
		return
	}

	var req models.UpdateTicketRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Status != nil {
		_ = h.Store.UpdateTicket(r.Context(), ticketID, req.Status, nil, nil, nil)
		actType := "ticket-updated"
		if *req.Status == "resolved" {
			actType = "ticket-resolved"
		}
		_ = h.Store.CreateActivity(r.Context(), &models.ActivityItem{
			ID:          "act-" + uuid.NewString()[:8],
			Type:        actType,
			Description: fmt.Sprintf("Ticket %s status changed to %s", ticketID, *req.Status),
			UserID:      userID,
			TicketID:    &ticketID,
			CreatedAt:   time.Now().UTC(),
		})
	}
	if req.Priority != nil {
		_ = h.Store.UpdateTicket(r.Context(), ticketID, nil, req.Priority, nil, nil)
	}
	if req.AssignTo != nil {
		empty := ""
		assignTo := *req.AssignTo
		if assignTo == "" {
			_ = h.Store.UpdateTicket(r.Context(), ticketID, nil, nil, &empty, nil)
		} else {
			_ = h.Store.UpdateTicket(r.Context(), ticketID, nil, nil, &assignTo, nil)
		}
	}

	updated, _ := h.Store.GetTicket(r.Context(), ticketID)
	if updated != nil {
		writeJSON(w, http.StatusOK, updated.ToResponse())
		return
	}
	writeJSON(w, http.StatusOK, t.ToResponse())
}

func (h *TicketHandler) AddMessage(w http.ResponseWriter, r *http.Request) {
	ticketID := r.PathValue("id")
	userID := middleware.GetUserID(r.Context())

	t, err := h.Store.GetTicket(r.Context(), ticketID)
	if err != nil || t == nil {
		writeError(w, http.StatusNotFound, "ticket not found")
		return
	}

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
	now := time.Now().UTC()

	m := &models.Message{
		ID:         msgID,
		TicketID:   ticketID,
		UserID:     userID,
		Content:    req.Content,
		IsInternal: req.IsInternal,
		CreatedAt:  now,
	}
	if err := h.Store.AddMessage(r.Context(), m); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add message")
		return
	}

	_ = h.Store.UpdateTicket(r.Context(), ticketID, nil, nil, nil, nil) // updates updated_at

	_ = h.Store.CreateActivity(r.Context(), &models.ActivityItem{
		ID:          "act-" + uuid.NewString()[:8],
		Type:        "message-added",
		Description: "New message on " + ticketID,
		UserID:      userID,
		TicketID:    &ticketID,
		CreatedAt:   now,
	})

	writeJSON(w, http.StatusCreated, map[string]string{"id": msgID})
}

func (h *TicketHandler) AddTimeEntry(w http.ResponseWriter, r *http.Request) {
	ticketID := r.PathValue("id")
	userID := middleware.GetUserID(r.Context())

	t, err := h.Store.GetTicket(r.Context(), ticketID)
	if err != nil || t == nil {
		writeError(w, http.StatusNotFound, "ticket not found")
		return
	}

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
	now := time.Now().UTC()

	te := &models.TimeEntry{
		ID:          teID,
		TicketID:    ticketID,
		UserID:      userID,
		Hours:       req.Hours,
		Description: req.Description,
		Date:        req.Date,
		CreatedAt:   now,
	}
	if err := h.Store.AddTimeEntry(r.Context(), te); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add time entry")
		return
	}

	newHours := t.HoursWorked + req.Hours
	_ = h.Store.UpdateTicket(r.Context(), ticketID, nil, nil, nil, &newHours)

	writeJSON(w, http.StatusCreated, map[string]string{"id": teID})
}

func (h *TicketHandler) RequestConversion(w http.ResponseWriter, r *http.Request) {
	ticketID := r.PathValue("id")
	userID := middleware.GetUserID(r.Context())

	t, err := h.Store.GetTicket(r.Context(), ticketID)
	if err != nil || t == nil {
		writeError(w, http.StatusNotFound, "ticket not found")
		return
	}

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
	now := time.Now().UTC()

	cr := &models.ConversionRequest{
		ID:               crID,
		TicketID:         ticketID,
		ProposedType:     req.ProposedType,
		Reason:           req.Reason,
		InternalApproval: "pending",
		ClientApproval:   "pending",
		ProposedBy:       userID,
		CreatedAt:        now,
	}
	if err := h.Store.CreateConversionRequest(r.Context(), cr); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create conversion request: "+err.Error())
		return
	}

	_ = h.Store.CreateActivity(r.Context(), &models.ActivityItem{
		ID:          "act-" + uuid.NewString()[:8],
		Type:        "conversion-requested",
		Description: fmt.Sprintf("Conversion requested: %s to %s", ticketID, req.ProposedType),
		UserID:      userID,
		TicketID:    &ticketID,
		CreatedAt:   now,
	})

	writeJSON(w, http.StatusCreated, map[string]string{"id": crID})
}
