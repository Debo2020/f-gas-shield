-- Add stores_manager to the app_role enum (must be committed before use)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'stores_manager';