-- ================================================================
-- EthioSwap: Funded Accounts Marketplace + On-chain Deposit/Withdraw
-- ================================================================

-- ----------------------------------------------------------------
-- 1. FUNDED ACCOUNT FIRMS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funded_account_firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  country TEXT DEFAULT 'Global',
  website TEXT,
  accepts_ethiopians BOOLEAN DEFAULT TRUE,
  rating DECIMAL DEFAULT 4.5,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funded_firms_active ON funded_account_firms(is_active);

-- ----------------------------------------------------------------
-- 2. FUNDED ACCOUNT PLANS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funded_account_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES funded_account_firms(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  account_size_usd DECIMAL NOT NULL,
  price_usd DECIMAL NOT NULL,
  profit_split_percent DECIMAL DEFAULT 80,
  max_daily_loss_percent DECIMAL DEFAULT 5,
  max_total_loss_percent DECIMAL DEFAULT 10,
  profit_target_percent DECIMAL DEFAULT 10,
  min_trading_days INTEGER DEFAULT 10,
  leverage TEXT DEFAULT '1:100',
  instruments TEXT[] DEFAULT ARRAY['Forex', 'Indices', 'Commodities', 'Crypto'],
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funded_plans_firm ON funded_account_plans(firm_id);

-- ----------------------------------------------------------------
-- 3. FUNDED ACCOUNT PURCHASES TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funded_account_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES funded_account_firms(id),
  plan_id UUID REFERENCES funded_account_plans(id),
  buyer_full_name TEXT NOT NULL,
  buyer_father_name TEXT,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_telegram TEXT,
  buyer_trading_experience TEXT,
  plan_price_usd DECIMAL NOT NULL,
  platform_fee_usd DECIMAL NOT NULL,
  total_charged_usd DECIMAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_tx_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'delivered', 'cancelled', 'refunded')),
  delivery_details JSONB,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funded_purchases_user ON funded_account_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_funded_purchases_status ON funded_account_purchases(status);

-- ----------------------------------------------------------------
-- 4. ON-CHAIN DEPOSIT TRANSACTIONS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onchain_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chain TEXT NOT NULL,
  token TEXT DEFAULT 'USDT',
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  tx_hash TEXT UNIQUE,
  amount_token DECIMAL NOT NULL,
  platform_fee_usd DECIMAL NOT NULL,
  net_credit_usd DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirming', 'confirmed', 'credited', 'failed')),
  confirmations INTEGER DEFAULT 0,
  required_confirmations INTEGER DEFAULT 3,
  block_number BIGINT,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onchain_deposits_user ON onchain_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_onchain_deposits_txhash ON onchain_deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_onchain_deposits_status ON onchain_deposits(status);

-- ----------------------------------------------------------------
-- 5. ON-CHAIN WITHDRAW TRANSACTIONS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onchain_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chain TEXT NOT NULL,
  token TEXT DEFAULT 'USDT',
  to_address TEXT NOT NULL,
  tx_hash TEXT UNIQUE,
  amount_usd DECIMAL NOT NULL,
  platform_fee_usd DECIMAL NOT NULL,
  net_sent_usd DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'confirmed', 'failed')),
  admin_wallet_debit DECIMAL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_onchain_withdrawals_user ON onchain_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_onchain_withdrawals_status ON onchain_withdrawals(status);

-- ----------------------------------------------------------------
-- 6. SYSTEM SETTINGS: Add chain wallet addresses + fee columns
-- ----------------------------------------------------------------
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS chain_wallets JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS funded_accounts_fee_percent DECIMAL DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS funded_deposit_fee_percent DECIMAL DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS funded_withdraw_fee_percent DECIMAL DEFAULT 2.0;

-- ----------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ----------------------------------------------------------------
ALTER TABLE funded_account_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE funded_account_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE funded_account_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE onchain_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE onchain_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firms readable by all" ON funded_account_firms;
CREATE POLICY "Firms readable by all" ON funded_account_firms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Firms managed by admin" ON funded_account_firms;
CREATE POLICY "Firms managed by admin" ON funded_account_firms FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Plans readable by all" ON funded_account_plans;
CREATE POLICY "Plans readable by all" ON funded_account_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "Plans managed by admin" ON funded_account_plans;
CREATE POLICY "Plans managed by admin" ON funded_account_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Purchases user sees own" ON funded_account_purchases;
CREATE POLICY "Purchases user sees own" ON funded_account_purchases FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Purchases user can insert" ON funded_account_purchases;
CREATE POLICY "Purchases user can insert" ON funded_account_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Purchases admin can update" ON funded_account_purchases;
CREATE POLICY "Purchases admin can update" ON funded_account_purchases FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Onchain deposits user sees own" ON onchain_deposits;
CREATE POLICY "Onchain deposits user sees own" ON onchain_deposits FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Onchain deposits user can insert" ON onchain_deposits;
CREATE POLICY "Onchain deposits user can insert" ON onchain_deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Onchain deposits admin can update" ON onchain_deposits;
CREATE POLICY "Onchain deposits admin can update" ON onchain_deposits FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Onchain withdrawals user sees own" ON onchain_withdrawals;
CREATE POLICY "Onchain withdrawals user sees own" ON onchain_withdrawals FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Onchain withdrawals user can insert" ON onchain_withdrawals;
CREATE POLICY "Onchain withdrawals user can insert" ON onchain_withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 8. SEED DATA: Ethiopian-accessible funded account firms
-- ----------------------------------------------------------------
INSERT INTO funded_account_firms (name, description, is_active, accepts_ethiopians, rating, review_count, website) VALUES
('FTMO', 'World leading funded trader program. Accepts global traders including Ethiopians. Pay via crypto.', TRUE, TRUE, 4.8, 2840, 'https://ftmo.com'),
('MyForexFunds', 'Popular prop firm with flexible evaluation rules. Crypto payments accepted.', TRUE, TRUE, 4.6, 1920, 'https://myforexfunds.com'),
('The 5%ers', 'UK-based prop firm with instant funding and scaling plans. Very Ethiopian-friendly.', TRUE, TRUE, 4.7, 1450, 'https://the5ers.com'),
('Topstep', 'Futures-focused prop firm with global reach. Accepts Ethiopian traders via crypto.', TRUE, TRUE, 4.5, 980, 'https://topstep.com'),
('Fidelcrest', 'Multiple account sizes with aggressive scaling. Full crypto payment support.', TRUE, TRUE, 4.6, 876, 'https://fidelcrest.com'),
('True Forex Funds', 'No time limit evaluations, low cost. Accepts Ethiopian traders.', TRUE, TRUE, 4.4, 640, 'https://trueforexfunds.com'),
('Funded Engineer', 'Great for African traders, instant funding options available.', TRUE, TRUE, 4.3, 420, 'https://fundedengineering.com'),
('Alpha Capital Group', 'Crypto-friendly prop firm, accessible from Ethiopia.', TRUE, TRUE, 4.2, 310, 'https://alphacapitalgroup.uk')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- 9. FUNCTION: Credit on-chain deposit to user wallet (auto)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION credit_onchain_deposit(p_deposit_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_deposit onchain_deposits%ROWTYPE;
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
  v_settings_id UUID;
  v_collected_fees DECIMAL;
BEGIN
  SELECT * INTO v_deposit FROM onchain_deposits WHERE id = p_deposit_id AND status = 'confirmed';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit not found or not confirmed');
  END IF;

  SELECT eth_balance INTO v_current_balance FROM users WHERE id = v_deposit.user_id;
  v_new_balance := COALESCE(v_current_balance, 0) + v_deposit.net_credit_usd;

  UPDATE users SET eth_balance = v_new_balance WHERE id = v_deposit.user_id;
  UPDATE onchain_deposits SET status = 'credited', credited_at = NOW() WHERE id = p_deposit_id;

  SELECT id, collected_fees_eth INTO v_settings_id, v_collected_fees FROM system_settings LIMIT 1;
  IF FOUND THEN
    UPDATE system_settings
    SET collected_fees_eth = COALESCE(v_collected_fees, 0) + v_deposit.platform_fee_usd
    WHERE id = v_settings_id;
  END IF;

  INSERT INTO deposit_requests (user_id, amount_usd, amount_eth, wallet_type, sender_reference, username, status, reviewed_at)
  SELECT v_deposit.user_id, v_deposit.net_credit_usd, v_deposit.net_credit_usd / 3000.0,
         v_deposit.chain, v_deposit.tx_hash, u.username, 'approved', NOW()
  FROM users u WHERE u.id = v_deposit.user_id;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;
