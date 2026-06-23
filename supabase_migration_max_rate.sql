-- =========================================================
-- EthioSwap Migration: Add max_custom_rate_etb to system_settings
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- =========================================================

-- Step 1: Add the column (nullable so existing rows are not affected)
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS max_custom_rate_etb NUMERIC DEFAULT NULL;

-- Step 2: Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'system_settings'
  AND column_name = 'max_custom_rate_etb';

-- Step 3: Drop welcome email trigger to prevent signup distributed deadlocks/timeouts
DROP TRIGGER IF EXISTS on_auth_user_welcome_email ON auth.users;
DROP FUNCTION IF EXISTS public.send_welcome_email();
