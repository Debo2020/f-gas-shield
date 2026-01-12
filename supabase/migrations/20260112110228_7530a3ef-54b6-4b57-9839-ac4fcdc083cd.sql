-- Step 1: Add new enum values to app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'auditor';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'read_only';