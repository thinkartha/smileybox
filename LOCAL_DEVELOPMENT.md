# Running SupportDesk locally on your laptop

Run the backend (Go API) and frontend (Next.js) on your machine with **DynamoDB** as the data store.

## Prerequisites

- **Node.js** 20+ and **pnpm** (`npm install -g pnpm`)
- **Go** 1.22+
- **DynamoDB** – either:
  - **AWS account** with DynamoDB tables created (e.g. by deploying the SAM stack once), or
  - **DynamoDB Local** (Docker or standalone) for offline development

---

## 1. Data store (DynamoDB)

The app uses DynamoDB tables defined in `backend/aws/template.yaml`. Table names default to `supportdesk-*`.

**Option A – Use AWS (after first deploy)**

1. Deploy the backend once with SAM so that DynamoDB tables are created:
   ```bash
   cd backend/aws
   sam deploy --guided
   ```
2. Tables will be created in your AWS account. Use the same AWS credentials locally (e.g. `AWS_PROFILE` or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) so the Go server can read/write DynamoDB.

**Option B – DynamoDB Local (Docker)**

```bash
docker run -d --name dynamodb-local \
  -p 8000:8000 \
  amazon/dynamodb-local

# Create tables using AWS CLI (with --endpoint-url http://localhost:8000).
# You can use the same table names as in template.yaml; create them manually or with a script.
```

Then set `AWS_ENDPOINT_URL=http://localhost:8000` (or use the SDK’s local endpoint config) and ensure table names match (e.g. `USERS_TABLE=supportdesk-users`).

---

## 2. Backend (Go API)

From the repo root:

```bash
cd backend
```

Set environment variables:

| Variable        | Default                 | Description                    |
|----------------|-------------------------|--------------------------------|
| USERS_TABLE    | supportdesk-users      | DynamoDB users table          |
| ORGS_TABLE     | supportdesk-organizations | DynamoDB orgs table        |
| TICKETS_TABLE  | supportdesk-tickets   | DynamoDB tickets table        |
| MESSAGES_TABLE | supportdesk-messages   | DynamoDB messages table       |
| TIME_ENTRIES_TABLE | supportdesk-time-entries | DynamoDB time entries  |
| CONVERSION_REQUESTS_TABLE | supportdesk-conversion-requests | Conversion requests |
| INVOICES_TABLE | supportdesk-invoices   | DynamoDB invoices table       |
| ACTIVITIES_TABLE | supportdesk-activities | DynamoDB activities table   |
| JWT_SECRET     | change-me-in-production | Signing key for JWT           |
| FRONTEND_URL   | http://localhost:3000  | Allowed CORS origin           |
| PORT           | 8080                   | API port                      |

**Run the server:**

```bash
# With defaults (uses default AWS config / DynamoDB Local endpoint if set)
go run ./cmd/server

# Or with explicit env
JWT_SECRET=my-local-secret go run ./cmd/server
```

Backend will be at **http://localhost:8080**.

---

## 3. Frontend (Next.js)

Open a **new terminal** from the repo root:

```bash
pnpm install
```

Create a local env file:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local
```

Start the dev server:

```bash
pnpm dev
```

Frontend will be at **http://localhost:3000**.

---

## 4. First user (no sign-up flow)

There is **no sign-up flow**. Users are created by admins (Settings → Users) or by inserting a user into DynamoDB.

**Create a user in DynamoDB** (e.g. via AWS CLI or a small script):

- **Table:** `supportdesk-users` (or your `USERS_TABLE`)
- **Attributes:** `id` (string), `name`, `email`, `password_hash` (bcrypt of your password), `role`, `avatar`, `created_at` (ISO8601).
- Optional: `organization_id` for client users.

Example (AWS CLI, after tables exist):

```bash
# Create an admin user (password: password123)
# Generate bcrypt hash first, e.g. with a small Go script or online tool, then:
aws dynamodb put-item --table-name supportdesk-users --item '{
  "id": {"S": "user-admin-1"},
  "name": {"S": "Admin"},
  "email": {"S": "admin@supportdesk.io"},
  "password_hash": {"S": "$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa"},
  "role": {"S": "admin"},
  "avatar": {"S": "AD"},
  "created_at": {"S": "2025-01-01T00:00:00Z"}
}'
```

Then log in with **admin@supportdesk.io** / **password123**.

---

## Quick reference

| Service   | URL                    | Command / note                    |
|----------|------------------------|------------------------------------|
| Frontend | http://localhost:3000 | `pnpm dev` (from repo root)        |
| Backend  | http://localhost:8080 | `go run ./cmd/server` (from `backend/`) |
| Data     | DynamoDB               | AWS or DynamoDB Local             |

**Two terminals:**

1. **Terminal 1 – backend:** `cd backend && go run ./cmd/server`
2. **Terminal 2 – frontend:** `pnpm dev` (from repo root)

Then open http://localhost:3000.
