-- ============================================================================
-- Support Ticket Portal - Database DDL
-- Schema: mysupporttickr
-- PostgreSQL 14+
-- ============================================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS mysupporttickr;

-- Set search path
SET search_path TO mysupporttickr, public;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE mysupporttickr.user_role AS ENUM (
        'admin', 'support-lead', 'support-staff', 'client'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mysupporttickr.ticket_status AS ENUM (
        'open', 'in-progress', 'awaiting-client', 'resolved', 'closed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mysupporttickr.ticket_priority AS ENUM (
        'low', 'medium', 'high', 'critical'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mysupporttickr.ticket_category AS ENUM (
        'bug', 'support', 'question', 'feature', 'enhancement'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mysupporttickr.approval_status AS ENUM (
        'pending', 'approved', 'rejected'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mysupporttickr.invoice_status AS ENUM (
        'draft', 'sent', 'paid'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mysupporttickr.org_plan AS ENUM (
        'starter', 'professional', 'enterprise'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mysupporttickr.activity_type AS ENUM (
        'ticket-created', 'ticket-updated', 'message-added',
        'ticket-resolved', 'conversion-requested', 'conversion-approved'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Organizations
CREATE TABLE IF NOT EXISTS mysupporttickr.organizations (
    id              VARCHAR(50)     PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    plan            mysupporttickr.org_plan NOT NULL DEFAULT 'starter',
    contact_email   VARCHAR(255)    NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS mysupporttickr.users (
    id              VARCHAR(50)     PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            mysupporttickr.user_role NOT NULL DEFAULT 'client',
    organization_id VARCHAR(50)     REFERENCES mysupporttickr.organizations(id) ON DELETE SET NULL,
    avatar          VARCHAR(10)     NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tickets
CREATE TABLE IF NOT EXISTS mysupporttickr.tickets (
    id              VARCHAR(50)     PRIMARY KEY,
    title           VARCHAR(500)    NOT NULL,
    description     TEXT            NOT NULL,
    status          mysupporttickr.ticket_status NOT NULL DEFAULT 'open',
    priority        mysupporttickr.ticket_priority NOT NULL DEFAULT 'medium',
    category        mysupporttickr.ticket_category NOT NULL DEFAULT 'support',
    organization_id VARCHAR(50)     NOT NULL REFERENCES mysupporttickr.organizations(id) ON DELETE CASCADE,
    created_by      VARCHAR(50)     NOT NULL REFERENCES mysupporttickr.users(id) ON DELETE CASCADE,
    assigned_to     VARCHAR(50)     REFERENCES mysupporttickr.users(id) ON DELETE SET NULL,
    hours_worked    DECIMAL(10,2)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS mysupporttickr.messages (
    id              VARCHAR(50)     PRIMARY KEY,
    ticket_id       VARCHAR(50)     NOT NULL REFERENCES mysupporttickr.tickets(id) ON DELETE CASCADE,
    user_id         VARCHAR(50)     NOT NULL REFERENCES mysupporttickr.users(id) ON DELETE CASCADE,
    content         TEXT            NOT NULL,
    is_internal     BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Time Entries
CREATE TABLE IF NOT EXISTS mysupporttickr.time_entries (
    id              VARCHAR(50)     PRIMARY KEY,
    ticket_id       VARCHAR(50)     NOT NULL REFERENCES mysupporttickr.tickets(id) ON DELETE CASCADE,
    user_id         VARCHAR(50)     NOT NULL REFERENCES mysupporttickr.users(id) ON DELETE CASCADE,
    hours           DECIMAL(10,2)   NOT NULL,
    description     TEXT            NOT NULL DEFAULT '',
    entry_date      DATE            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Conversion Requests
CREATE TABLE IF NOT EXISTS mysupporttickr.conversion_requests (
    id                  VARCHAR(50)     PRIMARY KEY,
    ticket_id           VARCHAR(50)     NOT NULL UNIQUE REFERENCES mysupporttickr.tickets(id) ON DELETE CASCADE,
    proposed_type       mysupporttickr.ticket_category NOT NULL,
    reason              TEXT            NOT NULL,
    internal_approval   mysupporttickr.approval_status NOT NULL DEFAULT 'pending',
    client_approval     mysupporttickr.approval_status NOT NULL DEFAULT 'pending',
    proposed_by         VARCHAR(50)     NOT NULL REFERENCES mysupporttickr.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS mysupporttickr.invoices (
    id              VARCHAR(50)     PRIMARY KEY,
    organization_id VARCHAR(50)     NOT NULL REFERENCES mysupporttickr.organizations(id) ON DELETE CASCADE,
    month           INTEGER         NOT NULL CHECK (month BETWEEN 1 AND 12),
    year            INTEGER         NOT NULL CHECK (year >= 2020),
    tickets_closed  INTEGER         NOT NULL DEFAULT 0,
    total_hours     DECIMAL(10,2)   NOT NULL DEFAULT 0,
    rate_per_hour   DECIMAL(10,2)   NOT NULL DEFAULT 150,
    total_amount    DECIMAL(12,2)   NOT NULL DEFAULT 0,
    status          mysupporttickr.invoice_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, month, year)
);

-- Activities
CREATE TABLE IF NOT EXISTS mysupporttickr.activities (
    id              VARCHAR(50)     PRIMARY KEY,
    type            mysupporttickr.activity_type NOT NULL,
    description     TEXT            NOT NULL,
    user_id         VARCHAR(50)     NOT NULL REFERENCES mysupporttickr.users(id) ON DELETE CASCADE,
    ticket_id       VARCHAR(50)     REFERENCES mysupporttickr.tickets(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_org ON mysupporttickr.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON mysupporttickr.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON mysupporttickr.users(email);

CREATE INDEX IF NOT EXISTS idx_tickets_org ON mysupporttickr.tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON mysupporttickr.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON mysupporttickr.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON mysupporttickr.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON mysupporttickr.tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON mysupporttickr.tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON mysupporttickr.tickets(category);

CREATE INDEX IF NOT EXISTS idx_messages_ticket ON mysupporttickr.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON mysupporttickr.messages(created_at);

CREATE INDEX IF NOT EXISTS idx_time_entries_ticket ON mysupporttickr.time_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON mysupporttickr.time_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_conversion_ticket ON mysupporttickr.conversion_requests(ticket_id);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON mysupporttickr.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON mysupporttickr.invoices(year, month);

CREATE INDEX IF NOT EXISTS idx_activities_created ON mysupporttickr.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_ticket ON mysupporttickr.activities(ticket_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON mysupporttickr.activities(user_id);

-- ============================================================================
-- TRIGGER: Auto-update updated_at on tickets
-- ============================================================================

CREATE OR REPLACE FUNCTION mysupporttickr.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON mysupporttickr.tickets;
CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON mysupporttickr.tickets
    FOR EACH ROW
    EXECUTE FUNCTION mysupporttickr.update_updated_at();

DROP TRIGGER IF EXISTS trg_conversion_updated_at ON mysupporttickr.conversion_requests;
CREATE TRIGGER trg_conversion_updated_at
    BEFORE UPDATE ON mysupporttickr.conversion_requests
    FOR EACH ROW
    EXECUTE FUNCTION mysupporttickr.update_updated_at();
