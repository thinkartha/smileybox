package handlers

import (
	"database/sql"
	"net/http"

	"github.com/supporttickr/backend/internal/middleware"
	"github.com/supporttickr/backend/internal/models"
)

type UserHandler struct {
	DB     *sql.DB
	Schema string
}

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	query := `SELECT id, name, email, role, organization_id, avatar FROM ` + h.Schema + `.users`

	var rows *sql.Rows
	var err error

	if role == "client" && orgID != "" {
		// Clients see their own org users + internal staff (for display purposes)
		query += ` WHERE organization_id = $1 OR organization_id IS NULL ORDER BY name`
		rows, err = h.DB.Query(query, orgID)
	} else {
		query += ` ORDER BY name`
		rows, err = h.DB.Query(query)
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query users")
		return
	}
	defer rows.Close()

	var users []models.UserResponse
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.OrganizationID, &u.Avatar); err == nil {
			users = append(users, u.ToResponse())
		}
	}

	if users == nil {
		users = []models.UserResponse{}
	}

	writeJSON(w, http.StatusOK, users)
}

func (h *UserHandler) Get(w http.ResponseWriter, r *http.Request) {
	userIDParam := r.PathValue("id")

	var u models.User
	err := h.DB.QueryRow(
		`SELECT id, name, email, role, organization_id, avatar FROM `+h.Schema+`.users WHERE id = $1`,
		userIDParam,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.OrganizationID, &u.Avatar)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	writeJSON(w, http.StatusOK, u.ToResponse())
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	if role != "admin" {
		writeError(w, http.StatusForbidden, "admin access required")
		return
	}

	var input struct {
		Name           string  `json:"name"`
		Email          string  `json:"email"`
		Role           string  `json:"role"`
		OrganizationID *string `json:"organizationId"`
		Password       *string `json:"password"`
	}
	if err := readJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if input.Name == "" || input.Email == "" || input.Role == "" {
		writeError(w, http.StatusBadRequest, "name, email, and role are required")
		return
	}

	// Generate avatar from initials
	words := splitWords(input.Name)
	avatar := ""
	for _, w := range words {
		if len(w) > 0 {
			avatar += string([]rune(w)[0])
		}
	}
	if len(avatar) > 2 {
		avatar = avatar[:2]
	}
	avatar = toUpper(avatar)

	// Default password
	passwordHash := "$2a$10$default" // placeholder
	if input.Password != nil && *input.Password != "" {
		// In production, use bcrypt.GenerateFromPassword
		passwordHash = "$2a$10$8K1p/a0dR1xFh0K3YGZhYuTZbE7RZGM0hHgKJLz6lIxBk1y0WCWK"
	}

	id := "user-" + generateID()
	var orgID interface{} = nil
	if input.OrganizationID != nil && *input.OrganizationID != "" {
		orgID = *input.OrganizationID
	}

	_, err := h.DB.Exec(
		`INSERT INTO `+h.Schema+`.users (id, name, email, password_hash, role, organization_id, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, input.Name, input.Email, passwordHash, input.Role, orgID, avatar,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create user: "+err.Error())
		return
	}

	var u models.User
	h.DB.QueryRow(`SELECT id, name, email, role, organization_id, avatar FROM `+h.Schema+`.users WHERE id = $1`, id).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.OrganizationID, &u.Avatar)

	writeJSON(w, http.StatusCreated, u.ToResponse())
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	if role != "admin" {
		writeError(w, http.StatusForbidden, "admin access required")
		return
	}

	userIDParam := r.PathValue("id")

	var input struct {
		Name           *string `json:"name"`
		Email          *string `json:"email"`
		Role           *string `json:"role"`
		OrganizationID *string `json:"organizationId"`
	}
	if err := readJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	setClauses := []string{}
	args := []interface{}{}
	argIdx := 1

	if input.Name != nil {
		setClauses = append(setClauses, "name = $"+itoa(argIdx))
		args = append(args, *input.Name)
		argIdx++
		// Update avatar
		words := splitWords(*input.Name)
		avatar := ""
		for _, w := range words {
			if len(w) > 0 {
				avatar += string([]rune(w)[0])
			}
		}
		if len(avatar) > 2 {
			avatar = avatar[:2]
		}
		setClauses = append(setClauses, "avatar = $"+itoa(argIdx))
		args = append(args, toUpper(avatar))
		argIdx++
	}
	if input.Email != nil {
		setClauses = append(setClauses, "email = $"+itoa(argIdx))
		args = append(args, *input.Email)
		argIdx++
	}
	if input.Role != nil {
		setClauses = append(setClauses, "role = $"+itoa(argIdx))
		args = append(args, *input.Role)
		argIdx++
	}
	if input.OrganizationID != nil {
		if *input.OrganizationID == "" {
			setClauses = append(setClauses, "organization_id = NULL")
		} else {
			setClauses = append(setClauses, "organization_id = $"+itoa(argIdx))
			args = append(args, *input.OrganizationID)
			argIdx++
		}
	}

	if len(setClauses) == 0 {
		writeError(w, http.StatusBadRequest, "no fields to update")
		return
	}

	query := "UPDATE " + h.Schema + ".users SET "
	for i, clause := range setClauses {
		if i > 0 {
			query += ", "
		}
		query += clause
	}
	query += " WHERE id = $" + itoa(argIdx)
	args = append(args, userIDParam)

	res, err := h.DB.Exec(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update user")
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	var u models.User
	h.DB.QueryRow(`SELECT id, name, email, role, organization_id, avatar FROM `+h.Schema+`.users WHERE id = $1`, userIDParam).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.OrganizationID, &u.Avatar)

	writeJSON(w, http.StatusOK, u.ToResponse())
}

func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	role := middleware.GetRole(r.Context())
	if role != "admin" {
		writeError(w, http.StatusForbidden, "admin access required")
		return
	}

	userIDParam := r.PathValue("id")

	// Don't allow deleting the currently logged-in user
	currentUserID := middleware.GetUserID(r.Context())
	if userIDParam == currentUserID {
		writeError(w, http.StatusBadRequest, "cannot delete your own account")
		return
	}

	// Unassign tickets
	h.DB.Exec(`UPDATE `+h.Schema+`.tickets SET assigned_to = NULL WHERE assigned_to = $1`, userIDParam)

	res, err := h.DB.Exec(`DELETE FROM `+h.Schema+`.users WHERE id = $1`, userIDParam)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete user")
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// Helper functions
func splitWords(s string) []string {
	words := []string{}
	current := ""
	for _, c := range s {
		if c == ' ' || c == '\t' {
			if current != "" {
				words = append(words, current)
				current = ""
			}
		} else {
			current += string(c)
		}
	}
	if current != "" {
		words = append(words, current)
	}
	return words
}

func toUpper(s string) string {
	result := ""
	for _, c := range s {
		if c >= 'a' && c <= 'z' {
			result += string(c - 32)
		} else {
			result += string(c)
		}
	}
	return result
}
