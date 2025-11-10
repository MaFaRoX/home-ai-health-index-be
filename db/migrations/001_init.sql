-- Initial schema for healthcare backend

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(120) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  sex ENUM('male', 'female', 'other') NULL,
  preferred_language VARCHAR(5) NOT NULL DEFAULT 'vi',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  refresh_token CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS indicator_categories (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(50) NOT NULL UNIQUE,
  default_color VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS indicators (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  reference_min DECIMAL(10, 2) NULL,
  reference_max DECIMAL(10, 2) NULL,
  reference_text VARCHAR(255) NULL,
  reference_male_min DECIMAL(10, 2) NULL,
  reference_male_max DECIMAL(10, 2) NULL,
  reference_female_min DECIMAL(10, 2) NULL,
  reference_female_max DECIMAL(10, 2) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_indicators_category FOREIGN KEY (category_id) REFERENCES indicator_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS indicator_translations (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  indicator_id BIGINT UNSIGNED NOT NULL,
  language VARCHAR(5) NOT NULL,
  translated_name VARCHAR(100) NOT NULL,
  translated_reference_text VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_translations_indicator FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
  CONSTRAINT uq_translations_indicator_language UNIQUE (indicator_id, language)
);

CREATE TABLE IF NOT EXISTS test_sessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(50) NULL,
  month TINYINT NOT NULL,
  year SMALLINT NOT NULL,
  measured_at DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_test_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_test_sessions_month CHECK (month BETWEEN 1 AND 12)
);

CREATE TABLE IF NOT EXISTS measurements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  test_session_id BIGINT UNSIGNED NOT NULL,
  indicator_id BIGINT UNSIGNED NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_measurements_session FOREIGN KEY (test_session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_measurements_indicator FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
  CONSTRAINT uq_measurements UNIQUE (test_session_id, indicator_id)
);

CREATE TABLE IF NOT EXISTS goals (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  indicator_id BIGINT UNSIGNED NULL,
  target_min DECIMAL(10, 2) NULL,
  target_max DECIMAL(10, 2) NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_goals_indicator FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  frequency ENUM('daily', 'weekly', 'monthly', 'custom') NOT NULL,
  next_trigger_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reminders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_test_sessions_user ON test_sessions(user_id);
CREATE INDEX idx_measurements_indicator ON measurements(indicator_id);

