-- Update auth_provider enum from 'phone' to 'local'
-- This aligns with the migration from phone to username authentication

-- MySQL doesn't support direct enum modification, so we need to:
-- 1. Modify the column to use a temporary type
-- 2. Update existing 'phone' values to 'local'
-- 3. Modify back to the new enum

-- Step 1: Change column to VARCHAR temporarily
ALTER TABLE users 
  MODIFY auth_provider VARCHAR(10) NOT NULL;

-- Step 2: Update existing 'phone' values to 'local'
UPDATE users 
SET auth_provider = 'local'
WHERE auth_provider = 'phone';

-- Step 3: Change back to ENUM with new values
ALTER TABLE users 
  MODIFY auth_provider ENUM('local', 'google', 'both') NOT NULL DEFAULT 'local';

