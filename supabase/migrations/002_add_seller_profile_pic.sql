-- Add seller_name, seller_profile_pic to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_profile_pic TEXT;

-- Backfill existing listings with seller profile pics from users table
UPDATE listings l
SET seller_name = u.username,
    seller_profile_pic = u.profile_pic
FROM users u
WHERE l.seller_id = u.id
  AND l.seller_name IS NULL;
