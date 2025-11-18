-- Google OAuth support
-- Enables Google authentication alongside phone/password authentication

-- Make password_hash nullable (Google users don't have passwords)
ALTER TABLE users 
  MODIFY password_hash VARCHAR(255) NULL;

-- Add Google OAuth fields
ALTER TABLE users 
  ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER email,
  ADD COLUMN google_email VARCHAR(120) NULL AFTER google_id,
  ADD COLUMN avatar_url VARCHAR(500) NULL AFTER google_email,
  ADD COLUMN auth_provider ENUM('phone', 'google', 'both') NOT NULL DEFAULT 'phone' AFTER avatar_url;

-- Add index for faster Google ID lookups
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_google_email ON users(google_email);

-- Update existing users to have auth_provider = 'phone' if they have password_hash
UPDATE users 
SET auth_provider = 'phone' 
WHERE password_hash IS NOT NULL AND auth_provider = 'phone';

