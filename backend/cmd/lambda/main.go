package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/supporttickr/backend/internal/config"
	"github.com/supporttickr/backend/internal/database"
	"github.com/supporttickr/backend/internal/routes"
)

var adapter *httpadapter.HandlerAdapterV2

func init() {
	log.Println("Lambda cold start: initializing SupportDesk API...")

	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	handler := routes.Setup(db, cfg)
	adapter = httpadapter.NewV2(handler)

	log.Println("Lambda initialization complete")
}

func handleRequest(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return adapter.ProxyWithContext(ctx, req)
}

func main() {
	lambda.Start(handleRequest)
}
