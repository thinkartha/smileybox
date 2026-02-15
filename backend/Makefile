.PHONY: build build-lambda build-server clean test

# Build the standard server binary
build-server:
	@echo "Building server binary..."
	go build -o bin/server ./cmd/server/main.go

# Build the Lambda binary
build-lambda:
	@echo "Building Lambda binary..."
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build \
		-tags lambda.norpc \
		-ldflags="-s -w" \
		-o bootstrap \
		./cmd/lambda/main.go

# SAM build target
build-ApiFunctionFunction:
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build \
		-tags lambda.norpc \
		-ldflags="-s -w" \
		-o $(ARTIFACTS_DIR)/bootstrap \
		./cmd/lambda/main.go

# Package Lambda deployment zip
package: build-lambda
	zip -j function.zip bootstrap
	@echo "Created function.zip"

# Run locally
run:
	go run ./cmd/server/main.go

# Clean build artifacts
clean:
	rm -f bin/server bootstrap function.zip

# Run tests
test:
	go test ./...
