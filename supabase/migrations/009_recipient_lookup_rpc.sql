-- Migration: Add secure recipient lookup RPC and execute transfer RPC
-- This allows authenticated users to search for other users securely (avoiding RLS restrictions)
-- and executes internal transfers atomically on the database side.

-- 1. Recipient Lookup Function
CREATE OR REPLACE FUNCTION get_user_by_username_or_email(search_query TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  full_name TEXT,
  profile_pic TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: only allow authenticated users to perform lookups
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  search_query := ltrim(rtrim(search_query), '@');
  
  RETURN QUERY
  SELECT u.id, u.username, u.email, u.full_name, u.profile_pic
  FROM users u
  WHERE (u.username ILIKE search_query OR u.email ILIKE search_query)
    AND u.id <> auth.uid() -- Don't let users search for themselves
  LIMIT 1;
END;
$$;

-- Grant EXECUTE permission to authenticated role
GRANT EXECUTE ON FUNCTION get_user_by_username_or_email(TEXT) TO authenticated;

-- 2. Internal Transfer Execution Function
CREATE OR REPLACE FUNCTION execute_internal_transfer(recipient_username TEXT, transfer_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_id UUID;
  sender_bal NUMERIC;
  sender_uname TEXT;
  recipient_id UUID;
  recipient_bal NUMERIC;
  recipient_uname TEXT;
  eth_usd_val NUMERIC := 3000.0; -- Matches ETH_USD_PRICE in frontend
BEGIN
  -- Get sender ID from session
  sender_id := auth.uid();
  IF sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  recipient_username := ltrim(rtrim(recipient_username), '@');

  -- Get recipient details & lock row
  SELECT id, eth_balance, username INTO recipient_id, recipient_bal, recipient_uname
  FROM users
  WHERE username ILIKE recipient_username;

  IF recipient_id IS NULL THEN
    RAISE EXCEPTION 'Recipient user @% not found.', recipient_username;
  END IF;

  IF sender_id = recipient_id THEN
    RAISE EXCEPTION 'You cannot transfer funds to yourself.';
  END IF;

  IF transfer_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero.';
  END IF;

  -- Get sender details & lock row for update
  SELECT eth_balance, username INTO sender_bal, sender_uname
  FROM users
  WHERE id = sender_id
  FOR UPDATE;

  IF sender_bal < transfer_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: $%', sender_bal;
  END IF;

  -- Deduct from sender
  UPDATE users
  SET eth_balance = eth_balance - transfer_amount
  WHERE id = sender_id;

  -- Add to recipient
  UPDATE users
  SET eth_balance = eth_balance + transfer_amount
  WHERE id = recipient_id;

  -- Log transfer in withdraw_requests (approved)
  INSERT INTO withdraw_requests (
    user_id,
    amount_eth,
    amount_usd,
    address,
    wallet_type,
    username,
    status,
    reviewed_at
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

  -- Log transfer in deposit_requests (approved)
  INSERT INTO deposit_requests (
    user_id,
    amount_eth,
    amount_usd,
    screenshot_url,
    wallet_type,
    sender_reference,
    username,
    status,
    reviewed_at
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

  -- Log notification for sender
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    is_read
  ) VALUES (
    sender_id,
    'transfer_sent',
    'Transfer Successfully',
    'Your transfer of $' || TO_CHAR(transfer_amount, 'FM999,999,990.00') || ' USD to @' || recipient_uname || ' was completed successfully.',
    false
  );

  -- Log notification for recipient
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    is_read
  ) VALUES (
    recipient_id,
    'transfer_received',
    'Transfer Successfully',
    'You received $' || TO_CHAR(transfer_amount, 'FM999,999,990.00') || ' USD from @' || sender_uname || ' successfully.',
    false
  );
END;
$$;

-- Grant EXECUTE permission to authenticated role
GRANT EXECUTE ON FUNCTION execute_internal_transfer(TEXT, NUMERIC) TO authenticated;
