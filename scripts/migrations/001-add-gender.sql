-- Migration: Add gender to profiles
-- Run this on existing databases to add the gender column

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
        CREATE TYPE gender AS ENUM ('male', 'female');
    END IF;
END$$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender gender;
