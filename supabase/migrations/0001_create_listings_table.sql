-- Enable the uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the listings table (matches the existing code exactly!)
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_name TEXT,
    seller_profile_pic TEXT,
    amount_eth NUMERIC NOT NULL,
    min_limit_etb NUMERIC NOT NULL,
    max_limit_etb NUMERIC NOT NULL,
    payment_methods TEXT[] NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    custom_rate_etb NUMERIC,
    payment_accounts JSONB,
    description TEXT,
    payment_window INTEGER DEFAULT 15,
    allow_third_party BOOLEAN DEFAULT false,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS listings_status_idx ON public.listings(status);
CREATE INDEX IF NOT EXISTS listings_seller_id_idx ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS listings_type_idx ON public.listings(type);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON public.listings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Create the 4 policies as requested!
-- Policy 1: Anyone can see active listings
CREATE POLICY "Anyone can view active listings"
ON public.listings
FOR SELECT
USING (status = 'active');

-- Policy 2: Users can create their own listings
CREATE POLICY "Users can create their own listings"
ON public.listings
FOR INSERT
WITH CHECK (seller_id = auth.uid());

-- Policy 3: Users can update their own listings
CREATE POLICY "Users can update their own listings"
ON public.listings
FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Policy 4: Users can delete their own listings
CREATE POLICY "Users can delete their own listings"
ON public.listings
FOR DELETE
USING (seller_id = auth.uid());

-- Add a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
