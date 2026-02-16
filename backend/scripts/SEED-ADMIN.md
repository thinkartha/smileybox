# Creating an Admin User in DynamoDB

After deploying the SAM stack, you need at least one admin user to log in.

## Option 1: Go seed script (recommended)

From the `backend` directory, with AWS credentials configured:

```bash
# Set AWS region if not in ~/.aws/config
export AWS_REGION=us-east-1

# Create admin user
go run ./scripts/seed-admin \
  -email admin@supportfix.ai \
  -password "your-secure-password" \
  -name "Admin User"
```

Options:
- `-email` (required): Login email
- `-password` (required): Login password
- `-name` (optional): Display name (default: "Admin")

If `USERS_TABLE` is set, it overrides the default `supportdesk-users` table name.

## Option 2: AWS CLI (manual insert)

1. Generate a bcrypt hash: `go run ./scripts/seed-admin -password "your-password" -hash-only`

2. Insert with `aws dynamodb put-item`:

```bash
aws dynamodb put-item \
  --table-name supportdesk-users \
  --item '{
    "id": {"S": "user-admin-001"},
    "name": {"S": "Admin"},
    "email": {"S": "admin@supportfix.ai"},
    "password_hash": {"S": "$2a$10$YOUR_BCRYPT_HASH_HERE"},
    "role": {"S": "admin"},
    "avatar": {"S": "AD"},
    "created_at": {"S": "2025-01-01T00:00:00Z"}
  }'
```

Replace `$2a$10$YOUR_BCRYPT_HASH_HERE` with the actual bcrypt hash of your password.

## Roles

Valid roles: `admin`, `agent`, `client`
