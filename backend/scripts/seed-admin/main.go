// Seed an admin user into DynamoDB.
// Usage:
//
//	go run ./scripts/seed-admin -email admin@supportfix.ai -password your-secure-password
//	go run ./scripts/seed-admin -email admin@supportfix.ai -password your-password -name "Admin User"
//
// Env (optional): USERS_TABLE overrides default supportdesk-users. AWS credentials must be configured.
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/supporttickr/backend/internal/config"
	"github.com/supporttickr/backend/internal/models"
	"github.com/supporttickr/backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	email := flag.String("email", "", "Admin email (required)")
	password := flag.String("password", "", "Admin password (required)")
	name := flag.String("name", "Admin", "Display name")
	hashOnly := flag.Bool("hash-only", false, "Only print bcrypt hash (for AWS CLI put-item)")
	flag.Parse()

	if *password == "" {
		log.Fatal("Usage: go run ./scripts/seed-admin -email admin@example.com -password your-password [-name \"Admin Name\"] [-hash-only]")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	if *hashOnly {
		fmt.Println(string(hash))
		return
	}

	if *email == "" {
		log.Fatal("Usage: -email is required when not using -hash-only")
	}

	cfg := config.Load()
	ctx := context.Background()

	st, err := store.NewStore(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to create store: %v (ensure AWS credentials and region are set)", err)
	}

	// Check if user already exists
	existing, _ := st.GetUserByEmail(ctx, *email)
	if existing != nil {
		log.Fatalf("User with email %q already exists (id=%s). Use a different email or delete the existing user first.", *email, existing.ID)
	}

	avatar := initials(*name)
	u := &models.User{
		ID:           "user-" + uuid.New().String(),
		Name:         *name,
		Email:        *email,
		PasswordHash: string(hash),
		Role:         "admin",
		Avatar:       avatar,
		CreatedAt:    time.Now().UTC(),
	}

	if err := st.CreateUser(ctx, u); err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}

	fmt.Printf("Admin user created successfully.\n")
	fmt.Printf("  ID:    %s\n", u.ID)
	fmt.Printf("  Email: %s\n", u.Email)
	fmt.Printf("  Name:  %s\n", u.Name)
	fmt.Printf("  Role:  admin\n")
	fmt.Printf("\nYou can now log in at your frontend with this email and password.\n")
}

func initials(name string) string {
	words := strings.Fields(name)
	var init string
	for _, w := range words {
		if len(w) > 0 {
			init += string([]rune(w)[0])
		}
	}
	if len(init) > 2 {
		init = init[:2]
	}
	return strings.ToUpper(init)
}
