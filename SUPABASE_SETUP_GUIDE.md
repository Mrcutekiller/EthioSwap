# EthioSwap Supabase Setup Guide

## How to Apply the Listings Table Migration

1. Go to your Supabase Dashboard → https://supabase.com/dashboard
2. Select your EthioSwap project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the entire contents of `supabase/migrations/0001_create_listings_table.sql`
6. Paste it into the query editor
7. Click "Run" to execute the script

## What This Does

✅ Creates the `listings` table with all the exact columns the code expects
✅ Adds indexes to make queries fast
✅ Sets up RLS (Row Level Security) policies
✅ Auto-updates `updated_at` timestamp

## RLS Policies

| Policy | What it does |
|--------|--------------|
| Anyone can view active listings | All users see every active listing |
| Users can create their own listings | Only verified users can post ads (code checks too!) |
| Users can update their own listings | Only edit ads you created |
| Users can delete their own listings | Only delete ads you created |

## Verify the Setup

After running the query:
1. Go to "Table Editor" → Find "listings" table
2. Go to "Authentication" → "Policies" → Verify 4 policies exist for "listings"

## Test It

1. Create a new listing
2. Check it appears in Table Editor → listings
3. Check it appears on P2P marketplace immediately!
