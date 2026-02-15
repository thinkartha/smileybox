package handlers

import (
	"database/sql"
	"net/http"

	"github.com/supporttickr/backend/internal/middleware"
	"github.com/supporttickr/backend/internal/models"
)

type OrgHandler struct {
	DB     *sql.DB
	Schema string
}

func (h *OrgHandler) List(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var rows *sql.Rows
	var err error

	if role == "client" && orgID != "" {
		rows, err = h.DB.Query(
			`SELECT id, name, plan, contact_email, created_at FROM `+h.Schema+`.organizations WHERE id = $1 ORDER BY name`,
			orgID,
		)
	} else {
		rows, err = h.DB.Query(
			`SELECT id, name, plan, contact_email, created_at FROM ` + h.Schema + `.organizations ORDER BY name`,
		)
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query organizations")
		return
	}
	defer rows.Close()

	var orgs []models.Organization
	for rows.Next() {
		var o models.Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Plan, &o.ContactEmail, &o.CreatedAt); err == nil {
			orgs = append(orgs, o)
		}
	}

	if orgs == nil {
		orgs = []models.Organization{}
	}

	writeJSON(w, http.StatusOK, orgs)
}

func (h *OrgHandler) Get(w http.ResponseWriter, r *http.Request) {
	orgIDParam := r.PathValue("id")
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	if role == "client" && orgIDParam != orgID {
		writeError(w, http.StatusForbidden, "access denied")
		return
	}

	var o models.Organization
	err := h.DB.QueryRow(
		`SELECT id, name, plan, contact_email, created_at FROM `+h.Schema+`.organizations WHERE id = $1`,
		orgIDParam,
	).Scan(&o.ID, &o.Name, &o.Plan, &o.ContactEmail, &o.CreatedAt)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "organization not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	writeJSON(w, http.StatusOK, o)
}

func (h *OrgHandler) Create(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	if role != "admin" {
		writeError(w, http.StatusForbidden, "admin access required")
		return
	}

	var input struct {
		Name         string `json:"name"`
		Plan         string `json:"plan"`
		ContactEmail string `json:"contactEmail"`
	}
	if err := readJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if input.Name == "" || input.ContactEmail == "" {
		writeError(w, http.StatusBadRequest, "name and contactEmail are required")
		return
	}
	if input.Plan == "" {
		input.Plan = "starter"
	}

	id := "org-" + generateID()
	_, err := h.DB.Exec(
		`INSERT INTO `+h.Schema+`.organizations (id, name, plan, contact_email) VALUES ($1, $2, $3, $4)`,
		id, input.Name, input.Plan, input.ContactEmail,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create organization")
		return
	}

	var o models.Organization
	h.DB.QueryRow(`SELECT id, name, plan, contact_email, created_at FROM `+h.Schema+`.organizations WHERE id = $1`, id).
		Scan(&o.ID, &o.Name, &o.Plan, &o.ContactEmail, &o.CreatedAt)

	writeJSON(w, http.StatusCreated, o)
}

func (h *OrgHandler) Update(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	if role != "admin" {
		writeError(w, http.StatusForbidden, "admin access required")
		return
	}

	orgIDParam := r.PathValue("id")

	var input struct {
		Name         *string `json:"name"`
		Plan         *string `json:"plan"`
		ContactEmail *string `json:"contactEmail"`
	}
	if err := readJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Build dynamic update query
	setClauses := []string{}
	args := []interface{}{}
	argIdx := 1

	if input.Name != nil {
		setClauses = append(setClauses, "name = $"+itoa(argIdx))
		args = append(args, *input.Name)
		argIdx++
	}
	if input.Plan != nil {
		setClauses = append(setClauses, "plan = $"+itoa(argIdx))
		args = append(args, *input.Plan)
		argIdx++
	}
	if input.ContactEmail != nil {
		setClauses = append(setClauses, "contact_email = $"+itoa(argIdx))
		args = append(args, *input.ContactEmail)
		argIdx++
	}

	if len(setClauses) == 0 {
		writeError(w, http.StatusBadRequest, "no fields to update")
		return
	}

	query := "UPDATE " + h.Schema + ".organizations SET "
	for i, clause := range setClauses {
		if i > 0 {
			query += ", "
		}
		query += clause
	}
	query += " WHERE id = $" + itoa(argIdx)
	args = append(args, orgIDParam)

	res, err := h.DB.Exec(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update organization")
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "organization not found")
		return
	}

	var o models.Organization
	h.DB.QueryRow(`SELECT id, name, plan, contact_email, created_at FROM `+h.Schema+`.organizations WHERE id = $1`, orgIDParam).
		Scan(&o.ID, &o.Name, &o.Plan, &o.ContactEmail, &o.CreatedAt)

	writeJSON(w, http.StatusOK, o)
}

func (h *OrgHandler) Delete(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	if role != "admin" {
		writeError(w, http.StatusForbidden, "admin access required")
		return
	}

	orgIDParam := r.PathValue("id")

	// Cascade: delete users, tickets, invoices belonging to this org
	h.DB.Exec(`DELETE FROM `+h.Schema+`.time_entries WHERE ticket_id IN (SELECT id FROM `+h.Schema+`.tickets WHERE organization_id = $1)`, orgIDParam)
	h.DB.Exec(`DELETE FROM `+h.Schema+`.messages WHERE ticket_id IN (SELECT id FROM `+h.Schema+`.tickets WHERE organization_id = $1)`, orgIDParam)
	h.DB.Exec(`DELETE FROM `+h.Schema+`.conversion_requests WHERE ticket_id IN (SELECT id FROM `+h.Schema+`.tickets WHERE organization_id = $1)`, orgIDParam)
	h.DB.Exec(`DELETE FROM `+h.Schema+`.tickets WHERE organization_id = $1`, orgIDParam)
	h.DB.Exec(`DELETE FROM `+h.Schema+`.invoices WHERE organization_id = $1`, orgIDParam)
	h.DB.Exec(`DELETE FROM `+h.Schema+`.users WHERE organization_id = $1`, orgIDParam)

	res, err := h.DB.Exec(`DELETE FROM `+h.Schema+`.organizations WHERE id = $1`, orgIDParam)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete organization")
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "organization not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
