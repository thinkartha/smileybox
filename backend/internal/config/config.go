package config

import "os"

type Config struct {
	JWTSecret   string
	FrontendURL string
	Port        string
	// DynamoDB table names (from env in Lambda)
	UsersTable             string
	OrgsTable              string
	TicketsTable           string
	MessagesTable          string
	TimeEntriesTable       string
	ConversionRequestsTable string
	InvoicesTable          string
	ActivitiesTable        string
}

func Load() *Config {
	return &Config{
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		Port:        getEnv("PORT", "8080"),
		UsersTable:             getEnv("USERS_TABLE", "supportdesk-users"),
		OrgsTable:              getEnv("ORGS_TABLE", "supportdesk-organizations"),
		TicketsTable:           getEnv("TICKETS_TABLE", "supportdesk-tickets"),
		MessagesTable:          getEnv("MESSAGES_TABLE", "supportdesk-messages"),
		TimeEntriesTable:       getEnv("TIME_ENTRIES_TABLE", "supportdesk-time-entries"),
		ConversionRequestsTable: getEnv("CONVERSION_REQUESTS_TABLE", "supportdesk-conversion-requests"),
		InvoicesTable:          getEnv("INVOICES_TABLE", "supportdesk-invoices"),
		ActivitiesTable:       getEnv("ACTIVITIES_TABLE", "supportdesk-activities"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
