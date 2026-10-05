-- Migration: Add 'address' column (TEXT type) to 'users' table in PostgreSQL
-- Description: Non-destructive migration to support user address field
-- Strategy: ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
