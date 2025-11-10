# Database Schema Overview

## User & Authentication

- `users`
  - `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
  - `full_name` VARCHAR(120) NOT NULL
  - `phone` VARCHAR(20) NOT NULL UNIQUE
  - `email` VARCHAR(120) NULL UNIQUE
  - `password_hash` VARCHAR(255) NOT NULL
  - `sex` ENUM('male', 'female', 'other') NULL
  - `preferred_language` VARCHAR(5) NOT NULL DEFAULT 'vi'
  - `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

- `sessions`
  - `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
  - `user_id` BIGINT UNSIGNED NOT NULL REFERENCES `users`(`id`)
  - `refresh_token` CHAR(64) NOT NULL UNIQUE
  - `expires_at` DATETIME NOT NULL
  - `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

`sessions` supports refresh tokens; access tokens are JWTs signed with `JWT_SECRET`.

## Catalog Data

- `indicator_categories`
  - `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
  - `slug` VARCHAR(50) NOT NULL UNIQUE (e.g. `blood-sugar`)
  - `default_color` VARCHAR(20) NULL
  - `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

- `indicators`
  - `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
  - `category_id` BIGINT UNSIGNED NOT NULL REFERENCES `indicator_categories`(`id`)
  - `slug` VARCHAR(50) NOT NULL UNIQUE (e.g. `glucose`)
  - `display_name` VARCHAR(100) NOT NULL
  - `unit` VARCHAR(20) NOT NULL
  - `reference_min` DECIMAL(10, 2) NULL
  - `reference_max` DECIMAL(10, 2) NULL
  - `reference_text` VARCHAR(255) NULL
  - `reference_male_min` DECIMAL(10, 2) NULL
  - `reference_male_max` DECIMAL(10, 2) NULL
  - `reference_female_min` DECIMAL(10, 2) NULL
  - `reference_female_max` DECIMAL(10, 2) NULL
  - `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

- `indicator_translations`
  - `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
  - `indicator_id` BIGINT UNSIGNED NOT NULL REFERENCES `indicators`(`id`)
  - `language` VARCHAR(5) NOT NULL
  - `translated_name` VARCHAR(100) NOT NULL
  - `translated_reference_text` VARCHAR(255) NULL
  - UNIQUE (`indicator_id`, `language`)

## Measurement Data

- `test_sessions`
  - `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
  - `user_id` BIGINT UNSIGNED NOT NULL REFERENCES `users`(`id`)
  - `label` VARCHAR(50) NULL (e.g. "Annual Checkup")
  - `month` TINYINT NOT NULL CHECK (`month` BETWEEN 1 AND 12)
  - `year` SMALLINT NOT NULL
  - `measured_at` DATE NOT NULL
  - `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

- `measurements`
  - `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
  - `test_session_id` BIGINT UNSIGNED NOT NULL REFERENCES `test_sessions`(`id`)
  - `indicator_id` BIGINT UNSIGNED NOT NULL REFERENCES `indicators`(`id`)
  - `value` DECIMAL(10, 2) NOT NULL
  - `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  - UNIQUE (`test_session_id`, `indicator_id`)

## Goals & Reminders (Phase 2)

- `goals`
  - `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
  - `user_id` BIGINT UNSIGNED NOT NULL REFERENCES `users`(`id`)
  - `indicator_id` BIGINT UNSIGNED NULL REFERENCES `indicators`(`id`)
  - `target_min` DECIMAL(10, 2) NULL
  - `target_max` DECIMAL(10, 2) NULL
  - `note` VARCHAR(255) NULL
  - `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

- `reminders`
  - `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
  - `user_id` BIGINT UNSIGNED NOT NULL REFERENCES `users`(`id`)
  - `title` VARCHAR(120) NOT NULL
  - `description` VARCHAR(255) NULL
  - `frequency` ENUM('daily', 'weekly', 'monthly', 'custom') NOT NULL
  - `next_trigger_at` DATETIME NOT NULL
  - `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

## Seed Data

An initial seed script will populate `indicator_categories`, `indicators`, and `indicator_translations` based on the current frontend constants. This enables localized labels and reference ranges to be managed centrally.

## Indexing Strategy

- Add indexes on `users.phone`, `test_sessions.user_id`, `measurements.indicator_id` to speed up queries.
- When aggregating metrics by period, use `measured_at` for date ranges and join against `indicators` to retrieve metadata.

