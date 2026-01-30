-- Migration: Add exercise types support (muscu, cardio, hiit)
-- This migration adds scalable structure for exercise types and library

-- ============================================
-- 1. Exercise Types Table (for future: icons, colors, descriptions)
-- ============================================
CREATE TABLE IF NOT EXISTS exercise_types (
    id VARCHAR(20) PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    icon_name VARCHAR(50),        -- For future: Ionicons name
    color VARCHAR(20),            -- For future: hex color
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert base types
INSERT INTO exercise_types (id, label, icon_name) VALUES
    ('muscu', 'Musculation', 'barbell'),
    ('cardio', 'Cardio', 'bicycle'),
    ('hiit', 'HIIT', 'flash')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Exercise Library Table (for future: predefined exercises with images)
-- ============================================
CREATE TABLE IF NOT EXISTS exercise_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type_id VARCHAR(20) REFERENCES exercise_types(id),
    image_url VARCHAR(500),
    description TEXT,
    muscle_groups TEXT[],         -- For future: targeted muscles
    equipment TEXT[],             -- For future: required equipment
    is_system BOOLEAN DEFAULT TRUE,  -- System vs user-created
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert some common exercises for future use
INSERT INTO exercise_library (name, type_id, is_system) VALUES
    -- Muscu
    ('Squat', 'muscu', true),
    ('Bench Press', 'muscu', true),
    ('Deadlift', 'muscu', true),
    ('Pull-ups', 'muscu', true),
    ('Shoulder Press', 'muscu', true),
    ('Bicep Curl', 'muscu', true),
    ('Tricep Extension', 'muscu', true),
    ('Leg Press', 'muscu', true),
    ('Lunges', 'muscu', true),
    ('Rows', 'muscu', true),
    -- Cardio
    ('Velo', 'cardio', true),
    ('Rameur', 'cardio', true),
    ('Marche', 'cardio', true),
    ('Course', 'cardio', true),
    ('Corde a sauter', 'cardio', true),
    ('Elliptique', 'cardio', true),
    -- HIIT
    ('Burpees', 'hiit', true),
    ('Mountain Climbers', 'hiit', true),
    ('Jump Squats', 'hiit', true),
    ('High Knees', 'hiit', true),
    ('Sprint', 'hiit', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. Add new columns to workout_exercises
-- ============================================

-- Exercise type (muscu, cardio, hiit)
ALTER TABLE workout_exercises
ADD COLUMN IF NOT EXISTS exercise_type VARCHAR(20) DEFAULT 'muscu';

-- HIIT specific fields
ALTER TABLE workout_exercises
ADD COLUMN IF NOT EXISTS work_seconds INTEGER;

ALTER TABLE workout_exercises
ADD COLUMN IF NOT EXISTS rest_seconds INTEGER;

ALTER TABLE workout_exercises
ADD COLUMN IF NOT EXISTS rounds INTEGER;

-- Link to library (optional, for future use)
ALTER TABLE workout_exercises
ADD COLUMN IF NOT EXISTS library_exercise_id UUID REFERENCES exercise_library(id);

-- ============================================
-- 4. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_exercise_library_type ON exercise_library(type_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_type ON workout_exercises(exercise_type);
