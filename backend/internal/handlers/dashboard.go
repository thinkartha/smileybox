package handlers

import (
	"net/http"

	"github.com/supporttickr/backend/internal/middleware"
	"github.com/supporttickr/backend/internal/models"
	"github.com/supporttickr/backend/internal/store"
)

type DashboardHandler struct {
	Store store.Store
}

func (h *DashboardHandler) Stats(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	organizationID := ""
	if role == "client" && orgID != "" {
		organizationID = orgID
	}

	tickets, err := h.Store.ListTickets(r.Context(), "", "", "", organizationID, "", "")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tickets")
		return
	}

	stats := models.DashboardStats{
		TotalTickets:    len(tickets),
		OpenTickets:     0,
		InProgress:       0,
		Resolved:         0,
		Closed:           0,
		AvgResponseTime: "2.4h",
		TotalHours:       0,
		PendingApproval: 0,
	}

	for _, t := range tickets {
		switch t.Status {
		case "open":
			stats.OpenTickets++
		case "in-progress":
			stats.InProgress++
		case "resolved":
			stats.Resolved++
		case "closed":
			stats.Closed++
		}
		stats.TotalHours += t.HoursWorked
	}

	if role != "client" {
		pending, _ := h.Store.ListConversionRequestsPending(r.Context())
		stats.PendingApproval = len(pending)
	} else if orgID != "" {
		pending, _ := h.Store.ListConversionRequestsPending(r.Context())
		for _, cr := range pending {
			t, _ := h.Store.GetTicket(r.Context(), cr.TicketID)
			if t != nil && t.OrganizationID == orgID && cr.ClientApproval == "pending" {
				stats.PendingApproval++
			}
		}
	}

	writeJSON(w, http.StatusOK, stats)
}

func (h *DashboardHandler) Activities(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	list, err := h.Store.ListActivities(r.Context(), 50)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query activities")
		return
	}

	var activities []models.ActivityResponse
	for _, a := range list {
		if role == "client" && orgID != "" && a.TicketID != nil {
			t, _ := h.Store.GetTicket(r.Context(), *a.TicketID)
			if t == nil || t.OrganizationID != orgID {
				continue
			}
		}
		activities = append(activities, a.ToResponse())
	}
	if activities == nil {
		activities = []models.ActivityResponse{}
	}

	writeJSON(w, http.StatusOK, activities)
}
