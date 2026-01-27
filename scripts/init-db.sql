-- FitCoach AI Database Schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'premium');
CREATE TYPE oauth_provider AS ENUM ('google', 'facebook', 'apple');
CREATE TYPE workout_type AS ENUM ('weights', 'cardio', 'hiit', 'running', 'yoga', 'other');
CREATE TYPE activity_level AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');
CREATE TYPE fitness_goal AS ENUM ('lose_weight', 'gain_muscle', 'maintain', 'improve_endurance');

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
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

-- User profiles (fitness info)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_weight DECIMAL(5,2),
    target_weight DECIMAL(5,2),
    height INTEGER, -- in cm
    birth_date DATE,
    activity_level activity_level DEFAULT 'moderate',
    goal fitness_goal DEFAULT 'maintain',
    daily_calorie_target INTEGER,
    allergies TEXT[],
    diet_preferences TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Weight logs
CREATE TABLE weight_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL,
    logged_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, logged_at::DATE)
);

-- Workouts
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type workout_type NOT NULL,
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
    sets INTEGER,
    reps INTEGER,
    weight_kg DECIMAL(5,2),
    duration_seconds INTEGER,
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

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_weight_logs_user_date ON weight_logs(user_id, logged_at DESC);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, logged_at DESC);
CREATE INDEX idx_steps_logs_user_date ON steps_logs(user_id, logged_at DESC);
CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_ai_generations_user_date ON ai_generations(user_id, created_at DESC);

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
