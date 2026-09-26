-- Migration 024: Public Platform Statistics RPC
-- Provides aggregated platform metrics (total users, completed trades, trade volume) 
-- without exposing user identities or PII, callable by anonymous and authenticated visitors.

CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users_count BIGINT := 0;
  v_trades_count BIGINT := 0;
  v_total_volume NUMERIC := 0;
BEGIN
  -- 1. Total registered users
  SELECT count(*) INTO v_users_count 
  FROM public.users;

  -- 2. Total completed trades
  SELECT count(*) INTO v_trades_count 
  FROM public.trades 
  WHERE status = 'completed';

  -- 3. Total trade volume in USD
  SELECT coalesce(sum(coalesce(amount_usd, amount_eth, 0)), 0) INTO v_total_volume 
  FROM public.trades 
  WHERE status = 'completed';

  RETURN json_build_object(
    'total_users', v_users_count,
    'total_trades', v_trades_count,
    'total_volume', v_total_volume
  );
END;
$$;

-- Grant public read access to the aggregate statistics RPC
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;
