-- Migration 001: notification delivery logs
-- Idempotent: safe to run on an existing database.
-- Apply with:
--   docker compose exec -T postgres psql -U fitapp -d fitapp < scripts/migrations/001_notification_logs.sql

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'simulated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel notification_channel NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    template VARCHAR(100),
    subject VARCHAR(255),
    status notification_status NOT NULL,
    provider_id VARCHAR(255),
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);
