-- Migration 011: P2P Wallet History & Realtime Balance Fixes
-- Ensures:
--   1. notifications table has a trade_id column (referenced in code but missing)
--   2. P2P completed trades appear in both buyer & seller wallet history
--   3. execute_internal_transfer also refreshes realtime via update trigger
--   4. RLS policy allows users to read their own deposit/withdraw records after P2P completion

-- ============================================================
-- 1. Add trade_id to notifications (safe if already exists)
-- ============================================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS trade_id UUID REFERENCES trades(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_trade ON notifications(trade_id);

-- ============================================================
-- 2. Add wallet_type 'P2P' to deposit_requests if not already allowed
-- ============================================================
-- Drop the existing check constraint and recreate with P2P included
ALTER TABLE deposit_requests DROP CONSTRAINT IF EXISTS deposit_requests_wallet_type_check;
-- wallet_type is TEXT with no CHECK, so no action needed. Proceed.

-- ============================================================
-- 3. Improved execute_internal_transfer with better logging
--    (Drop and recreate to pick up changes)
-- ============================================================
CREATE OR REPLACE FUNCTION execute_internal_transfer(recipient_username TEXT, transfer_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_id     UUID;
  sender_bal    NUMERIC;
  sender_uname  TEXT;
  recipient_id  UUID;
  recipient_bal NUMERIC;
  recipient_uname TEXT;
  eth_usd_val   NUMERIC := 3000.0;
BEGIN
  sender_id := auth.uid();
  IF sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  recipient_username := ltrim(rtrim(recipient_username), '@');

  -- Lock recipient row
  SELECT id, eth_balance, username INTO recipient_id, recipient_bal, recipient_uname
  FROM users
  WHERE username ILIKE recipient_username
  FOR UPDATE;

  IF recipient_id IS NULL THEN
    RAISE EXCEPTION 'Recipient user @% not found.', recipient_username;
  END IF;

  IF sender_id = recipient_id THEN
    RAISE EXCEPTION 'You cannot transfer funds to yourself.';
  END IF;

  IF transfer_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero.';
  END IF;

  -- Lock sender row
  SELECT eth_balance, username INTO sender_bal, sender_uname
  FROM users
  WHERE id = sender_id
  FOR UPDATE;

  IF sender_bal < transfer_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: $%', ROUND(sender_bal::numeric, 2);
  END IF;

  -- Deduct from sender
  UPDATE users
  SET eth_balance = eth_balance - transfer_amount,
      updated_at  = NOW()
  WHERE id = sender_id;

  -- Credit recipient
  UPDATE users
  SET eth_balance = eth_balance + transfer_amount,
      updated_at  = NOW()
  WHERE id = recipient_id;

  -- Sender's outgoing history
  INSERT INTO withdraw_requests (
    user_id, amount_eth, amount_usd, address,
    wallet_type, username, status, reviewed_at
  ) VALUES (
    sender_id,
    transfer_amount / eth_usd_val,
    transfer_amount,
    '@' || recipient_uname,
    'INTERNAL',
    sender_uname,
    'approved',
    NOW()
  );

  -- Recipient's incoming history
  INSERT INTO deposit_requests (
    user_id, amount_eth, amount_usd, screenshot_url,
    wallet_type, sender_reference, username, status, reviewed_at
  ) VALUES (
    recipient_id,
    transfer_amount / eth_usd_val,
    transfer_amount,
    '',
    'INTERNAL',
    '@' || sender_uname,
    recipient_uname,
    'approved',
    NOW()
  );

  -- Notification for sender
  INSERT INTO notifications (user_id, type, title, message, is_read)
  VALUES (
    sender_id,
    'transfer_sent',
    'Transfer Sent ✓',
    'Your transfer of $' || TO_CHAR(transfer_amount, 'FM999,999,990.00') || ' USD to @' || recipient_uname || ' was completed successfully.',
    false
  );

  -- Notification for recipient
  INSERT INTO notifications (user_id, type, title, message, is_read)
  VALUES (
    recipient_id,
    'transfer_received',
    'Funds Received 💰',
    'You received $' || TO_CHAR(transfer_amount, 'FM999,999,990.00') || ' USD from @' || sender_uname || ' — check your wallet!',
    false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_internal_transfer(TEXT, NUMERIC) TO authenticated;

-- ============================================================
-- 4. New function: complete_p2p_trade
--    Atomically releases escrow, logs history for both parties
-- ============================================================
CREATE OR REPLACE FUNCTION complete_p2p_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   UUID;
  v_buyer_id    UUID;
  v_seller_id   UUID;
  v_amount      NUMERIC;
  v_listing_id  UUID;
  v_seller_bal  NUMERIC;
  v_buyer_bal   NUMERIC;
  v_seller_trades INT;
  v_buyer_trades  INT;
  v_new_listing_amount NUMERIC;
  eth_usd_val   NUMERIC := 3000.0;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock and fetch the trade
  SELECT buyer_id, seller_id, amount_eth, listing_id
  INTO v_buyer_id, v_seller_id, v_amount, v_listing_id
  FROM trades
  WHERE id = p_trade_id
  FOR UPDATE;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;

  -- Only the seller (or admin) can release escrow
  IF v_caller_id != v_seller_id THEN
    -- Allow admins too
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_caller_id AND role = 'admin') THEN
      RAISE EXCEPTION 'Only the seller can release escrow';
    END IF;
  END IF;

  -- Fetch & lock seller
  SELECT eth_balance, total_trades INTO v_seller_bal, v_seller_trades
  FROM users WHERE id = v_seller_id FOR UPDATE;

  IF v_seller_bal < v_amount THEN
    RAISE EXCEPTION 'Seller has insufficient balance to release escrow';
  END IF;

  -- Fetch & lock buyer
  SELECT eth_balance, total_trades INTO v_buyer_bal, v_buyer_trades
  FROM users WHERE id = v_buyer_id FOR UPDATE;

  -- Deduct from seller, credit buyer
  UPDATE users
  SET eth_balance  = eth_balance - v_amount,
      total_trades = total_trades + 1,
      updated_at   = NOW()
  WHERE id = v_seller_id;

  UPDATE users
  SET eth_balance  = eth_balance + v_amount,
      total_trades = total_trades + 1,
      updated_at   = NOW()
  WHERE id = v_buyer_id;

  -- Update listing amount
  IF v_listing_id IS NOT NULL THEN
    SELECT GREATEST(0, amount_eth - v_amount) INTO v_new_listing_amount
    FROM listings WHERE id = v_listing_id;

    UPDATE listings
    SET amount_eth = v_new_listing_amount,
        status     = CASE WHEN v_new_listing_amount <= 0.001 THEN 'completed' ELSE 'active' END
    WHERE id = v_listing_id;
  END IF;

  -- Mark trade as completed
  UPDATE trades
  SET status       = 'completed',
      completed_at = NOW()
  WHERE id = p_trade_id;

  -- Log seller's outgoing in withdraw_requests (P2P)
  INSERT INTO withdraw_requests (
    user_id, amount_eth, amount_usd, address,
    wallet_type, username, status, reviewed_at
  )
  SELECT
    v_seller_id,
    v_amount / eth_usd_val,
    v_amount,
    'P2P Trade to @' || u.username,
    'P2P',
    s.username,
    'approved',
    NOW()
  FROM users s, users u
  WHERE s.id = v_seller_id AND u.id = v_buyer_id;

  -- Log buyer's incoming in deposit_requests (P2P)
  INSERT INTO deposit_requests (
    user_id, amount_eth, amount_usd, screenshot_url,
    wallet_type, sender_reference, username, status, reviewed_at
  )
  SELECT
    v_buyer_id,
    v_amount / eth_usd_val,
    v_amount,
    '',
    'P2P',
    'P2P Trade from @' || s.username,
    b.username,
    'approved',
    NOW()
  FROM users s, users b
  WHERE s.id = v_seller_id AND b.id = v_buyer_id;

  -- Notify buyer
  INSERT INTO notifications (user_id, type, title, message, trade_id, is_read)
  VALUES (
    v_buyer_id,
    'trade_completed',
    'Trade Completed 🎉',
    '$' || TO_CHAR(v_amount, 'FM999,999,990.00') || ' USDT has been released to your wallet. Check your balance!',
    p_trade_id,
    false
  );

  -- Notify seller
  INSERT INTO notifications (user_id, type, title, message, trade_id, is_read)
  VALUES (
    v_seller_id,
    'trade_completed',
    'Escrow Released ✓',
    'You released $' || TO_CHAR(v_amount, 'FM999,999,990.00') || ' USDT to the buyer. Trade is complete.',
    p_trade_id,
    false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_p2p_trade(UUID) TO authenticated;

-- ============================================================
-- 5. Add updated_at to users table if it doesn't exist
--    (needed so realtime triggers fire on balance change)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger to auto-update updated_at on users table
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 6. Ensure RLS policies allow users to read their own P2P entries
--    (already covered by existing policies, but ensure insert is allowed)
-- ============================================================
-- These policies exist already. No change needed.
-- deposit_requests: "Users can view own deposits" → auth.uid() = user_id ✓
-- withdraw_requests: "Users can view own withdrawals" → auth.uid() = user_id ✓

-- ============================================================
-- 7. Allow system (SECURITY DEFINER functions) to insert into
--    deposit_requests and withdraw_requests on behalf of any user
-- ============================================================
DROP POLICY IF EXISTS "System can insert deposit records" ON deposit_requests;
CREATE POLICY "System can insert deposit records" ON deposit_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert withdrawal records" ON withdraw_requests;
CREATE POLICY "System can insert withdrawal records" ON withdraw_requests
  FOR INSERT WITH CHECK (true);
