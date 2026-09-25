-- ============================================================
-- Migration 017: Credit Score, Trader Badges, Referrals,
--                Recurring Orders, & Group Escrow Sessions
-- EthioSwap — All new features in one migration
-- ============================================================

-- ─── 1. CREDIT SCORE COLUMNS ON USERS ────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credit_score INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS credit_score_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_earnings DECIMAL DEFAULT 0;

-- Auto-generate referral codes for existing users
UPDATE users
SET referral_code = UPPER(SUBSTRING(MD5(id::text || username), 1, 8))
WHERE referral_code IS NULL;

-- ─── 2. TRADER BADGES TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trader_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL,   -- 'bronze', 'silver', 'gold', 'platinum', 'elite', 'escrow_hero', 'speed_trader', 'volume_king'
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_trader_badges_user ON trader_badges(user_id);

-- ─── 3. RECURRING / SCHEDULED ORDERS (DCA) TABLE ────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('buy', 'sell')),
  amount_usd DECIMAL NOT NULL CHECK (amount_usd > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  payment_method TEXT NOT NULL,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  max_runs INTEGER,           -- NULL = unlimited
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_orders_user ON recurring_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_next ON recurring_orders(next_run_at) WHERE status = 'active';

-- ─── 4. GROUP ESCROW SESSIONS (Escrow-as-a-Service) ─────────────────────────
CREATE TABLE IF NOT EXISTS group_escrow_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_group_id TEXT NOT NULL,
  telegram_group_name TEXT,
  initiator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  counterpart_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  initiator_telegram_id TEXT NOT NULL,
  counterpart_telegram_id TEXT,
  amount_usd DECIMAL NOT NULL CHECK (amount_usd > 0),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'funded', 'released', 'disputed', 'cancelled')),
  escrow_tx_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_group_escrow_group ON group_escrow_sessions(telegram_group_id);
CREATE INDEX IF NOT EXISTS idx_group_escrow_status ON group_escrow_sessions(status);

-- ─── 5. REFERRALS TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'paid')),
  commission_earned DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  qualified_at TIMESTAMPTZ,
  UNIQUE(referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- ─── 6. RATE HISTORY TABLE (for prediction widget) ───────────────────────────
CREATE TABLE IF NOT EXISTS p2p_rate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_etb DECIMAL NOT NULL,
  rate_type TEXT DEFAULT 'buy' CHECK (rate_type IN ('buy', 'sell')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_history_date ON p2p_rate_history(recorded_at DESC);

-- ─── 7. FUNCTION: COMPUTE CREDIT SCORE ──────────────────────────────────────
CREATE OR REPLACE FUNCTION compute_credit_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 500; -- Base score
  v_completed_trades INTEGER;
  v_disputed_trades INTEGER;
  v_cancelled_trades INTEGER;
  v_total_volume DECIMAL;
  v_account_age_days INTEGER;
  v_reputation INTEGER;
  v_kyc_status TEXT;
  v_verified BOOLEAN;
BEGIN
  SELECT
    COALESCE(trade_count, 0),
    COALESCE(reputation, 100),
    COALESCE(kyc_status, 'none'),
    COALESCE(is_verified_trader, false),
    COALESCE(total_volume, 0),
    EXTRACT(DAY FROM (NOW() - created_at))
  INTO
    v_completed_trades,
    v_reputation,
    v_kyc_status,
    v_verified,
    v_total_volume,
    v_account_age_days
  FROM users WHERE id = p_user_id;

  -- Trade count points (up to +200)
  v_score := v_score + LEAST(v_completed_trades * 2, 200);

  -- Reputation points (0-100 reputation = 0-150 score)
  v_score := v_score + ((v_reputation - 50) * 3);

  -- Volume points (up to +100)
  v_score := v_score + LEAST(FLOOR(v_total_volume / 100)::INTEGER, 100);

  -- Account age (up to +50)
  v_score := v_score + LEAST(FLOOR(v_account_age_days / 7)::INTEGER, 50);

  -- KYC bonus
  IF v_kyc_status = 'approved' THEN v_score := v_score + 100; END IF;

  -- Verified trader bonus
  IF v_verified THEN v_score := v_score + 50; END IF;

  -- Count disputes and cancellations
  SELECT
    COUNT(*) FILTER (WHERE status = 'disputed'),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_disputed_trades, v_cancelled_trades
  FROM trades
  WHERE buyer_id = p_user_id OR seller_id = p_user_id;

  -- Dispute penalty (-30 per dispute)
  v_score := v_score - (v_disputed_trades * 30);

  -- Cancellation penalty (-5 per cancel)
  v_score := v_score - (v_cancelled_trades * 5);

  -- Clamp to 0-1000
  v_score := GREATEST(0, LEAST(1000, v_score));

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 8. FUNCTION: REFRESH CREDIT SCORE ──────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_user_credit_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_score INTEGER;
BEGIN
  v_new_score := compute_credit_score(p_user_id);
  UPDATE users
  SET credit_score = v_new_score, credit_score_updated_at = NOW()
  WHERE id = p_user_id;
  RETURN v_new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 9. TRIGGER: AUTO-REFRESH SCORE ON TRADE COMPLETE ───────────────────────
CREATE OR REPLACE FUNCTION trigger_refresh_credit_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'disputed', 'cancelled') AND
     OLD.status NOT IN ('completed', 'disputed', 'cancelled') THEN
    PERFORM refresh_user_credit_score(NEW.buyer_id);
    PERFORM refresh_user_credit_score(NEW.seller_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_credit_score_on_trade ON trades;
CREATE TRIGGER trg_credit_score_on_trade
  AFTER UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_credit_score();

-- ─── 10. FUNCTION: AWARD BADGES ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION award_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_trades INTEGER;
  v_volume DECIMAL;
  v_score INTEGER;
BEGIN
  SELECT COALESCE(trade_count, 0), COALESCE(total_volume, 0), COALESCE(credit_score, 500)
  INTO v_trades, v_volume, v_score
  FROM users WHERE id = p_user_id;

  -- Bronze: 5 trades
  IF v_trades >= 5 THEN
    INSERT INTO trader_badges (user_id, badge_type, badge_name, badge_icon, description)
    VALUES (p_user_id, 'bronze', 'Bronze Trader', '🥉', 'Completed 5+ trades on EthioSwap')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Silver: 25 trades
  IF v_trades >= 25 THEN
    INSERT INTO trader_badges (user_id, badge_type, badge_name, badge_icon, description)
    VALUES (p_user_id, 'silver', 'Silver Trader', '🥈', 'Completed 25+ trades on EthioSwap')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Gold: 100 trades
  IF v_trades >= 100 THEN
    INSERT INTO trader_badges (user_id, badge_type, badge_name, badge_icon, description)
    VALUES (p_user_id, 'gold', 'Gold Trader', '🥇', 'Completed 100+ trades on EthioSwap')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Platinum: 500 trades
  IF v_trades >= 500 THEN
    INSERT INTO trader_badges (user_id, badge_type, badge_name, badge_icon, description)
    VALUES (p_user_id, 'platinum', 'Platinum Trader', '💎', 'Completed 500+ trades — Elite level')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Volume King: $10k volume
  IF v_volume >= 10000 THEN
    INSERT INTO trader_badges (user_id, badge_type, badge_name, badge_icon, description)
    VALUES (p_user_id, 'volume_king', 'Volume King', '👑', '$10,000+ total trading volume')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Credit Elite: score >= 800
  IF v_score >= 800 THEN
    INSERT INTO trader_badges (user_id, badge_type, badge_name, badge_icon, description)
    VALUES (p_user_id, 'credit_elite', 'Credit Elite', '⭐', 'Credit score of 800+ — highly trusted trader')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 11. FUNCTION: PROCESS REFERRAL COMMISSION ───────────────────────────────
CREATE OR REPLACE FUNCTION process_referral_commission(p_referred_id UUID)
RETURNS VOID AS $$
DECLARE
  v_referral RECORD;
  v_commission DECIMAL;
  v_completed_trades INTEGER;
BEGIN
  -- Only qualify after first completed trade
  SELECT r.*, u.trade_count INTO v_referral
  FROM referrals r
  JOIN users u ON u.id = r.referred_id
  WHERE r.referred_id = p_referred_id AND r.status = 'pending';

  IF NOT FOUND THEN RETURN; END IF;

  SELECT COUNT(*) INTO v_completed_trades
  FROM trades
  WHERE (buyer_id = p_referred_id OR seller_id = p_referred_id)
    AND status = 'completed';

  IF v_completed_trades >= 1 THEN
    -- Commission: 0.2% of referral's total volume, capped at $5
    SELECT LEAST(COALESCE(total_volume, 0) * 0.002, 5) INTO v_commission
    FROM users WHERE id = p_referred_id;

    UPDATE referrals
    SET status = 'qualified', commission_earned = v_commission, qualified_at = NOW()
    WHERE referred_id = p_referred_id;

    -- Credit referrer's wallet
    UPDATE users
    SET balance_usd = balance_usd + v_commission,
        referral_earnings = referral_earnings + v_commission
    WHERE id = v_referral.referrer_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 12. RLS POLICIES ────────────────────────────────────────────────────────

-- Trader badges: public read, system write
ALTER TABLE trader_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_read" ON trader_badges;
CREATE POLICY "badges_read" ON trader_badges FOR SELECT USING (true);

-- Recurring orders: user owns their own
ALTER TABLE recurring_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recurring_orders_own" ON recurring_orders;
CREATE POLICY "recurring_orders_own" ON recurring_orders
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Group escrow: public read for group members (filtered by group_id in app)
ALTER TABLE group_escrow_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_escrow_read" ON group_escrow_sessions;
CREATE POLICY "group_escrow_read" ON group_escrow_sessions FOR SELECT USING (true);

-- Referrals: user can see their own referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_own" ON referrals;
CREATE POLICY "referrals_own" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Rate history: public read
ALTER TABLE p2p_rate_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_history_read" ON p2p_rate_history;
CREATE POLICY "rate_history_read" ON p2p_rate_history FOR SELECT USING (true);

-- ─── 13. INITIAL CREDIT SCORE BACKFILL ───────────────────────────────────────
-- Compute scores for existing users (runs once)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM users LOOP
    PERFORM refresh_user_credit_score(r.id);
    PERFORM award_badges(r.id);
  END LOOP;
END;
$$;

-- ─── 14. RECORD CURRENT RATE IN HISTORY ─────────────────────────────────────
INSERT INTO p2p_rate_history (rate_etb, rate_type)
SELECT value::DECIMAL, 'buy'
FROM system_settings WHERE key = 'etbRatePerDollar'
ON CONFLICT DO NOTHING;
