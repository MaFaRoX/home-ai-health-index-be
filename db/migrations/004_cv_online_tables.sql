-- CV_Online tables
-- Stores CV data and assets for the CV Online application

-- CVs table: Stores CV data in JSON format
CREATE TABLE IF NOT EXISTS cvs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  app_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  cv_data JSON NOT NULL,
  template_id INT NOT NULL DEFAULT 1,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  share_token VARCHAR(64) NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cvs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cvs_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE RESTRICT
);

-- CV assets table: Optional table for tracking uploaded images/files
CREATE TABLE IF NOT EXISTS cv_assets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cv_id BIGINT UNSIGNED NOT NULL,
  asset_type ENUM('photo', 'document', 'custom') NOT NULL DEFAULT 'photo',
  storage_path VARCHAR(500) NOT NULL,
  storage_url VARCHAR(500) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_assets_cv FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_cvs_user ON cvs(user_id);
CREATE INDEX idx_cvs_app ON cvs(app_id);
CREATE INDEX idx_cvs_user_app ON cvs(user_id, app_id);
CREATE INDEX idx_cvs_share_token ON cvs(share_token);
CREATE INDEX idx_cvs_created ON cvs(created_at);
CREATE INDEX idx_assets_cv ON cv_assets(cv_id);
CREATE INDEX idx_assets_type ON cv_assets(asset_type);

