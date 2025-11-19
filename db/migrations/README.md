# Database Migrations

This directory contains SQL migration scripts for the shared backend database.

## Migration Order

Migrations must be run in numerical order:

1. **001_init.sql** - Initial schema (users, sessions, healthcare tables)
2. **002_multi_app_subscriptions.sql** - Multi-app subscription system
3. **003_google_oauth.sql** - Google OAuth support
4. **004_cv_online_tables.sql** - CV_Online application tables
5. **005_rename_phone_to_username.sql** - Rename phone column to username
6. **006_update_auth_provider_enum.sql** - Update auth_provider enum from 'phone' to 'local'

## Running Migrations

### Manual Execution

Run each migration file in order against your MySQL database:

```bash
mysql -u your_user -p your_database < db/migrations/001_init.sql
mysql -u your_user -p your_database < db/migrations/002_multi_app_subscriptions.sql
mysql -u your_user -p your_database < db/migrations/003_google_oauth.sql
mysql -u your_user -p your_database < db/migrations/004_cv_online_tables.sql
mysql -u your_user -p your_database < db/migrations/005_rename_phone_to_username.sql
mysql -u your_user -p your_database < db/migrations/006_update_auth_provider_enum.sql
```

### Using MySQL Workbench or phpMyAdmin

1. Open the migration file
2. Execute the SQL script
3. Verify tables were created successfully
4. Move to the next migration

## Migration Details

### 002_multi_app_subscriptions.sql

Creates:
- `apps` table - Registry of all applications in the ecosystem
- `subscription_plans` table - Subscription plans per app
- `user_subscriptions` table - User subscriptions per app

Seeds:
- Apps: `healthcare`, `cv-online`
- Plans: Free and Premium plans for both apps

### 003_google_oauth.sql

Modifies:
- `users` table - Makes `password_hash` nullable, adds Google OAuth fields

Adds:
- `google_id`, `google_email`, `avatar_url`, `auth_provider` columns
- Indexes for Google lookups

### 004_cv_online_tables.sql

Creates:
- `cvs` table - Stores CV data in JSON format
- `cv_assets` table - Optional table for tracking uploaded images/files

### 005_rename_phone_to_username.sql

Modifies:
- `users` table - Renames `phone` column to `username` and extends length from VARCHAR(20) to VARCHAR(100)

### 006_update_auth_provider_enum.sql

Modifies:
- `users` table - Updates `auth_provider` enum from 'phone' to 'local' to align with username-based authentication

## Important Notes

- Migrations are idempotent (safe to run multiple times)
- Foreign key constraints ensure data integrity
- Indexes are created for performance optimization
- Seed data uses `ON DUPLICATE KEY UPDATE` to prevent errors on re-runs

## Verification

After running migrations, verify:

```sql
-- Check apps were created
SELECT * FROM apps;

-- Check subscription plans
SELECT a.name as app_name, sp.slug, sp.name, sp.price_monthly 
FROM subscription_plans sp 
JOIN apps a ON sp.app_id = a.id;

-- Check users table structure
DESCRIBE users;

-- Check CV tables exist
SHOW TABLES LIKE 'cv%';
```

