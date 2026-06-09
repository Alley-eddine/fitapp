-- Migration 004: user roles + coach ↔ student link
-- Idempotent: safe to run on an existing database.
-- Apply with:
--   docker compose exec -T postgres psql -U fitapp -d fitapp < scripts/migrations/004_roles_coach_students.sql

-- Role: 'coach' | 'student' | 'user' (autonomous). Default 'user'.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Link between a coach and a student (a coach has N students; a student has 0..1 coach).
CREATE TABLE IF NOT EXISTS coach_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (coach_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_students_coach ON coach_students(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_students_student ON coach_students(student_id);

-- To promote a real coach (e.g. Markus) once his account exists:
--   UPDATE users SET role = 'coach' WHERE email = 'markus@example.com';
