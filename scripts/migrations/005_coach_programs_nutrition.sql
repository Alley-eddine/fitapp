-- Migration 005: coach ↔ student invitations, training programs and nutrition plans.
-- Idempotent: safe to run on an existing database.
-- Apply with:
--   docker compose exec -T postgres psql -U fitapp -d fitapp < scripts/migrations/005_coach_programs_nutrition.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Invitations: a coach invites someone, who becomes their student on accept.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coach_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(16) UNIQUE NOT NULL,
    email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | accepted | revoked
    expires_at TIMESTAMP NOT NULL,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_invitations_coach ON coach_invitations(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_invitations_code ON coach_invitations(code);

-- ---------------------------------------------------------------------------
-- Training programs: authored by a coach, versioned by phase, weekly structure.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phase INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_programs_coach ON training_programs(coach_id);

-- One entry per training day of the week (1 = Monday … 7 = Sunday).
CREATE TABLE IF NOT EXISTS training_program_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    title VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (program_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_training_program_days_program ON training_program_days(program_id);

-- Mirrors workout_exercises so a planned day can feed the guided session player.
CREATE TABLE IF NOT EXISTS training_program_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_id UUID NOT NULL REFERENCES training_program_days(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    exercise_type VARCHAR(20) NOT NULL DEFAULT 'muscu',
    sets INTEGER,
    reps INTEGER,
    weight_kg DECIMAL(6,2),
    duration_seconds INTEGER,
    work_seconds INTEGER,
    rest_seconds INTEGER,
    rounds INTEGER,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_program_exercises_day ON training_program_exercises(day_id);

-- A program assigned to a student (start date + active phase).
CREATE TABLE IF NOT EXISTS program_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    active_phase INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | archived
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_assignments_student ON program_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_program_assignments_coach ON program_assignments(coach_id);
-- A student follows at most one active program at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_program_assignments_active_student
    ON program_assignments(student_id) WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- Nutrition plans: meals imposed by the coach (the AI must stay within them).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutrition_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phase INTEGER NOT NULL DEFAULT 1,
    daily_calories INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_coach ON nutrition_plans(coach_id);

CREATE TABLE IF NOT EXISTS nutrition_meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,          -- "Repas 1", "Collation"…
    order_index INTEGER NOT NULL DEFAULT 0,
    target_calories INTEGER,
    protein_g INTEGER,
    carbs_g INTEGER,
    fat_g INTEGER,
    foods TEXT[],                          -- allowed / imposed foods
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_nutrition_meals_plan ON nutrition_meals(plan_id);

CREATE TABLE IF NOT EXISTS nutrition_supplements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    dosage VARCHAR(100),
    timing VARCHAR(100),
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_nutrition_supplements_plan ON nutrition_supplements(plan_id);

CREATE TABLE IF NOT EXISTS nutrition_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | archived
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_assignments_student ON nutrition_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_assignments_coach ON nutrition_assignments(coach_id);
-- A student follows at most one active nutrition plan at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_assignments_active_student
    ON nutrition_assignments(student_id) WHERE status = 'active';
