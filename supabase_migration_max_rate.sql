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

-- Step 4: Allow all authenticated users to read other public profiles (username, profile_pic, etc.)
-- First drop if exists to prevent duplicate/conflict, then create it
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
CREATE POLICY "Anyone can view user profiles" ON public.users
  FOR SELECT USING (true);

-- Step 5: Add trade_id foreign key column to notifications
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE;

