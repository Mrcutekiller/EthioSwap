-- Add listing description, time window, and third-party rules
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS payment_window INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS allow_third_party BOOLEAN DEFAULT false;
