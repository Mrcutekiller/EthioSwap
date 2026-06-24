-- EthioSwap Migration: Add Level 2 Verification Columns to Users Table
-- Safe to run multiple times (idempotent)

ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_level_2_status TEXT DEFAULT 'none' CHECK (kyc_level_2_status IN ('none', 'pending', 'approved', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_level_2_doc TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_level_2_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_level_2_rejection_reason TEXT;
