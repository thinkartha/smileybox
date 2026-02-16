#!/bin/bash
set -euo pipefail

echo "=== Building SupportDesk Lambda Function ==="
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/.."

# Build the Lambda binary
echo "1. Building Go binary for Lambda (linux/amd64)..."
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build \
  -tags lambda.norpc \
  -ldflags="-s -w" \
  -o bootstrap \
  ./cmd/lambda/main.go

echo "2. Creating deployment package..."
zip -j function.zip bootstrap

echo ""
echo "=== Build Complete ==="
echo ""
echo "Deployment package: backend/function.zip"
echo ""
echo "To deploy with SAM:"
echo "  cd backend/aws"
echo "  sam deploy --guided"
echo ""
echo "To deploy with raw Lambda:"
echo "  aws lambda update-function-code \\"
echo "    --function-name supportdesk-api \\"
echo "    --zip-file fileb://../function.zip"
echo ""
echo "Environment variables needed:"
echo "  JWT_SECRET   - Secret for JWT token signing"
echo "  FRONTEND_URL - Frontend URL for CORS"
echo "  USERS_TABLE, ORGS_TABLE, TICKETS_TABLE, etc. - DynamoDB table names (set by SAM)"
