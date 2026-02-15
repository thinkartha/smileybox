package config

import "os"

type Config struct {
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	DBSchema    string
	DBSSLMode   string
	JWTSecret   string
	FrontendURL string
	Port        string
}

func Load() *Config {
	return &Config{
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      getEnv("DB_USER", "supporttickr"),
		DBPassword:  getEnv("DB_PASSWORD", "supporttickr123"),
		DBName:      getEnv("DB_NAME", "supporttickr"),
		DBSchema:    getEnv("DB_SCHEMA", "mysupporttickr"),
		DBSSLMode:   getEnv("DB_SSLMODE", "disable"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		Port:        getEnv("PORT", "8080"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
