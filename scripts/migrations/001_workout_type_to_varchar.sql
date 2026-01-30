-- Migration: Change workout type from ENUM to VARCHAR for free text session names
-- Run this on your database before using free text workout names

-- Step 1: Add a temporary column
ALTER TABLE workouts ADD COLUMN type_new VARCHAR(100);

-- Step 2: Copy data from old column to new
UPDATE workouts SET type_new = type::TEXT;

-- Step 3: Drop the old column
ALTER TABLE workouts DROP COLUMN type;

-- Step 4: Rename new column to type
ALTER TABLE workouts RENAME COLUMN type_new TO type;

-- Step 5: Add NOT NULL constraint
ALTER TABLE workouts ALTER COLUMN type SET NOT NULL;

-- Optional: Drop the enum type if no longer needed
-- DROP TYPE workout_type;
