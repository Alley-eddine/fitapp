-- FitCoach AI Database Schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'premium');
CREATE TYPE oauth_provider AS ENUM ('google', 'facebook', 'apple', 'email');
CREATE TYPE workout_type AS ENUM ('weights', 'cardio', 'hiit', 'running', 'yoga', 'other');
CREATE TYPE activity_level AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');
CREATE TYPE fitness_goal AS ENUM ('lose_weight', 'gain_muscle', 'maintain', 'improve_endurance');
CREATE TYPE gender AS ENUM ('male', 'female');
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push');
CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'simulated');

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(30),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    password_hash VARCHAR(255),
    provider oauth_provider NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    subscription subscription_tier DEFAULT 'free',
    subscription_ends_at TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    theme_preference VARCHAR(10) DEFAULT 'light',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);

-- Coach ↔ student link (a coach has N students; a student has 0..1 coach)
CREATE TABLE coach_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (coach_id, student_id)
);

-- User profiles (fitness info)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_weight DECIMAL(5,2),
    target_weight DECIMAL(5,2),
    height INTEGER, -- in cm
    birth_date DATE,
    gender gender,
    activity_level activity_level DEFAULT 'moderate',
    goal fitness_goal DEFAULT 'maintain',
    daily_calorie_target INTEGER,
    allergies TEXT[],
    diet_preferences TEXT[],
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Weight logs
CREATE TABLE weight_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL,
    logged_at TIMESTAMP DEFAULT NOW()
);

-- Workouts (type holds a free-text session name, e.g. "Dos / Biceps")
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    calories_burned INTEGER,
    notes TEXT,
    ai_guided BOOLEAN DEFAULT FALSE,
    logged_at TIMESTAMP DEFAULT NOW()
);

-- Workout exercises (detail of each workout)
CREATE TABLE workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    exercise_type VARCHAR(20) DEFAULT 'muscu',
    sets INTEGER,
    reps INTEGER,
    weight_kg DECIMAL(5,2),
    duration_seconds INTEGER,
    work_seconds INTEGER,
    rest_seconds INTEGER,
    rounds INTEGER,
    order_index INTEGER NOT NULL
);

-- Steps logs
CREATE TABLE steps_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    steps INTEGER NOT NULL,
    goal INTEGER DEFAULT 10000,
    logged_at DATE DEFAULT CURRENT_DATE,
    UNIQUE(user_id, logged_at)
);

-- Saved recipes
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    ingredients JSONB NOT NULL,
    instructions JSONB NOT NULL,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER,
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    tags TEXT[],
    is_from_frigo_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Meal plans
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    meals JSONB NOT NULL, -- {monday: {breakfast: recipe_id, lunch: recipe_id, dinner: recipe_id}, ...}
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- AI generation logs (for rate limiting)
CREATE TABLE ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'recipe', 'workout_suggestion', 'frigo_mode'
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Email verification tokens (one-time, expiring)
CREATE TABLE email_verification_tokens (
    token VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Password reset codes sent by SMS (6 digits, one-time, expiring)
CREATE TABLE password_reset_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notification delivery logs (email / sms / push tracking & reporting)
CREATE TABLE notification_logs (
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

-- Coach invitations (a coach invites someone, who becomes their student)
CREATE TABLE coach_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(16) UNIQUE NOT NULL,
    email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Training programs authored by a coach (versioned by phase, weekly structure)
CREATE TABLE training_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phase INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE training_program_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    title VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (program_id, day_of_week)
);

CREATE TABLE training_program_exercises (
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

CREATE TABLE program_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    active_phase INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Nutrition plans imposed by the coach (the AI must stay within them)
CREATE TABLE nutrition_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phase INTEGER NOT NULL DEFAULT 1,
    daily_calories INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE nutrition_meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    target_calories INTEGER,
    protein_g INTEGER,
    carbs_g INTEGER,
    fat_g INTEGER,
    foods TEXT[],
    notes TEXT
);

CREATE TABLE nutrition_supplements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    dosage VARCHAR(100),
    timing VARCHAR(100),
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE nutrition_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_weight_logs_user_date ON weight_logs(user_id, logged_at DESC);
CREATE UNIQUE INDEX idx_weight_logs_user_day ON weight_logs(user_id, (logged_at::date));
CREATE INDEX idx_workouts_user_date ON workouts(user_id, logged_at DESC);
CREATE INDEX idx_steps_logs_user_date ON steps_logs(user_id, logged_at DESC);
CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_ai_generations_user_date ON ai_generations(user_id, created_at DESC);
CREATE INDEX idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX idx_email_verification_user ON email_verification_tokens(user_id);
CREATE INDEX idx_password_reset_user ON password_reset_codes(user_id);
CREATE INDEX idx_coach_students_coach ON coach_students(coach_id);
CREATE INDEX idx_coach_students_student ON coach_students(student_id);
CREATE INDEX idx_coach_invitations_coach ON coach_invitations(coach_id);
CREATE INDEX idx_coach_invitations_code ON coach_invitations(code);
CREATE INDEX idx_training_programs_coach ON training_programs(coach_id);
CREATE INDEX idx_training_program_days_program ON training_program_days(program_id);
CREATE INDEX idx_training_program_exercises_day ON training_program_exercises(day_id);
CREATE INDEX idx_program_assignments_student ON program_assignments(student_id);
CREATE INDEX idx_program_assignments_coach ON program_assignments(coach_id);
CREATE UNIQUE INDEX idx_program_assignments_active_student
    ON program_assignments(student_id) WHERE status = 'active';
CREATE INDEX idx_nutrition_plans_coach ON nutrition_plans(coach_id);
CREATE INDEX idx_nutrition_meals_plan ON nutrition_meals(plan_id);
CREATE INDEX idx_nutrition_supplements_plan ON nutrition_supplements(plan_id);
CREATE INDEX idx_nutrition_assignments_student ON nutrition_assignments(student_id);
CREATE INDEX idx_nutrition_assignments_coach ON nutrition_assignments(coach_id);
CREATE UNIQUE INDEX idx_nutrition_assignments_active_student
    ON nutrition_assignments(student_id) WHERE status = 'active';

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
