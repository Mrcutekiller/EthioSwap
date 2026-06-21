-- EthioSwap: Listings table enhancements
-- Migration 002 — Add missing columns to listings
-- Run this in Supabase SQL editor (safe to run even if columns already exist)

ALTER TABLE listings 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS payment_window INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS allow_third_party BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';

-- Update RLS: allow anyone to view public listing data including images
-- (existing policies already cover this via status=active / seller_id checks)

-- Optionally, if you want a storage bucket for listing images, create it:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true)
-- ON CONFLICT (id) DO NOTHING;
-- 
-- CREATE POLICY "Anyone can view listing images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'listing-images');
-- 
-- CREATE POLICY "Sellers can upload listing images" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'listing-images' AND auth.uid() IS NOT NULL);
-- 
-- CREATE POLICY "Sellers can delete own listing images" ON storage.objects
--   FOR DELETE USING (bucket_id = 'listing-images' AND auth.uid() IS NOT NULL);
