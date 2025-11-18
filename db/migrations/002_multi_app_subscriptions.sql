-- Multi-app subscription system
-- Supports multiple apps in the ecosystem with flexible subscription plans

-- App registry: Define all apps in the ecosystem
CREATE TABLE IF NOT EXISTS apps (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Subscription plans: Different tiers/plans per app
CREATE TABLE IF NOT EXISTS subscription_plans (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  app_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  price_monthly DECIMAL(10, 2) NULL,
  price_yearly DECIMAL(10, 2) NULL,
  features JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plans_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
  CONSTRAINT uq_plans_app_slug UNIQUE (app_id, slug)
);

-- User subscriptions: Track active subscriptions per app
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  app_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active', 'expired', 'cancelled', 'pending') NOT NULL DEFAULT 'active',
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
);

-- Indexes for performance
CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_app ON user_subscriptions(app_id);
CREATE INDEX idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscriptions_dates ON user_subscriptions(end_date, status);
CREATE INDEX idx_subscriptions_user_app ON user_subscriptions(user_id, app_id);

-- Seed initial apps
INSERT INTO apps (slug, name, description) VALUES
  ('healthcare', 'Healthcare Tracker', 'Health monitoring and lab results tracking'),
  ('cv-online', 'CV Online', 'Professional CV builder and templates')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed subscription plans for Healthcare
INSERT INTO subscription_plans (app_id, slug, name, price_monthly, features)
SELECT 
  id,
  'free',
  'Free Plan',
  0,
  JSON_OBJECT(
    'max_sessions', 10,
    'max_measurements_per_session', 20,
    'advanced_analytics', false
  )
FROM apps WHERE slug = 'healthcare'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO subscription_plans (app_id, slug, name, price_monthly, features)
SELECT 
  id,
  'premium',
  'Premium Plan',
  14.99,
  JSON_OBJECT(
    'max_sessions', -1,
    'max_measurements_per_session', -1,
    'advanced_analytics', true,
    'export_reports', true
  )
FROM apps WHERE slug = 'healthcare'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed subscription plans for CV_Online
INSERT INTO subscription_plans (app_id, slug, name, price_monthly, features)
SELECT 
  id,
  'free',
  'Free Plan',
  0,
  JSON_OBJECT(
    'max_cvs', 1,
    'templates', JSON_ARRAY(1, 2, 3),
    'export_formats', JSON_ARRAY('pdf'),
    'analytics', false
  )
FROM apps WHERE slug = 'cv-online'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO subscription_plans (app_id, slug, name, price_monthly, features)
SELECT 
  id,
  'premium',
  'Premium Plan',
  9.99,
  JSON_OBJECT(
    'max_cvs', -1,
    'templates', 'all',
    'export_formats', JSON_ARRAY('pdf', 'docx'),
    'analytics', true,
    'custom_colors', true,
    'priority_support', true
  )
FROM apps WHERE slug = 'cv-online'
ON DUPLICATE KEY UPDATE name = VALUES(name);

