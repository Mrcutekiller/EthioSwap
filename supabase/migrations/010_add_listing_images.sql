-- Add images JSONB array to listings table if not exists
ALTER TABLE listings ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
