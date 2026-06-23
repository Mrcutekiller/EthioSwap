-- =========================================================
-- EthioSwap Migration: Fix Realtime Message Sync & RLS
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- =========================================================

-- Step 1: Add buyer_id and seller_id columns to public.messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 2: Create trigger function to automatically populate buyer_id and seller_id
CREATE OR REPLACE FUNCTION public.populate_message_parties()
RETURNS TRIGGER AS $$
BEGIN
  SELECT buyer_id, seller_id INTO NEW.buyer_id, NEW.seller_id
  FROM public.trades
  WHERE id = NEW.trade_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Attach the trigger BEFORE INSERT to public.messages
DROP TRIGGER IF EXISTS tr_populate_message_parties ON public.messages;
CREATE TRIGGER tr_populate_message_parties
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_message_parties();

-- Step 4: Backfill existing messages with party IDs
UPDATE public.messages m
SET buyer_id = t.buyer_id,
    seller_id = t.seller_id
FROM public.trades t
WHERE m.trade_id = t.id
  AND (m.buyer_id IS NULL OR m.seller_id IS NULL);

-- Step 5: Update Row Level Security (RLS) policies on public.messages
-- Drop old policies that join the trades table (which breaks Supabase Realtime RLS)
DROP POLICY IF EXISTS "Users can view trade messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;

-- Create new join-free RLS policies that use the new flat columns
CREATE POLICY "Users can view trade messages" ON public.messages
  FOR SELECT USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

CREATE POLICY "Users can create messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );
