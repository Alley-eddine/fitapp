-- Migration 003: exercise type + HIIT fields on workout_exercises
-- Idempotent: safe to run on an existing database.
-- Apply with:
--   docker compose exec -T postgres psql -U fitapp -d fitapp < scripts/migrations/003_workout_exercises_fields.sql

ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS exercise_type VARCHAR(20) DEFAULT 'muscu';
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS work_seconds INTEGER;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS rest_seconds INTEGER;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS rounds INTEGER;

-- Allow any workout type string (the app sends the free-text session name).
ALTER TABLE workouts ALTER COLUMN type DROP DEFAULT;
ALTER TABLE workouts ALTER COLUMN type TYPE VARCHAR(100) USING type::text;
