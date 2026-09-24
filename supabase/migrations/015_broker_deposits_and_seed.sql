-- ════════════════════════════════════════════════════════════════
-- EthioSwap Migration 015: Broker Deposits Table & Prop Firms Seed
-- ════════════════════════════════════════════════════════════════

-- 1. Create Broker Deposits Table
CREATE TABLE IF NOT EXISTS broker_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  broker_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  server_name TEXT,
  platform TEXT DEFAULT 'MT5',
  buyer_full_name TEXT NOT NULL,
  buyer_father_name TEXT,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_telegram TEXT,
  amount_usd DECIMAL NOT NULL,
  platform_fee_usd DECIMAL NOT NULL,
  total_charged_usd DECIMAL NOT NULL,
  payment_method TEXT DEFAULT 'wallet_balance',
  status TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'processing', 'completed', 'cancelled', 'refunded')),
  admin_notes TEXT,
  tx_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_broker_deposits_user ON broker_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_deposits_status ON broker_deposits(status);

-- 2. Row Level Security for broker_deposits
ALTER TABLE broker_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Broker deposits user sees own" ON broker_deposits;
CREATE POLICY "Broker deposits user sees own" ON broker_deposits FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Broker deposits user can insert" ON broker_deposits;
CREATE POLICY "Broker deposits user can insert" ON broker_deposits FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Broker deposits admin can update" ON broker_deposits;
CREATE POLICY "Broker deposits admin can update" ON broker_deposits FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 3. System Settings Configuration
UPDATE system_settings
SET 
  funded_accounts_fee_percent = COALESCE(funded_accounts_fee_percent, 3.0),
  funded_deposit_fee_percent  = COALESCE(funded_deposit_fee_percent,  2.5),
  funded_withdraw_fee_percent = COALESCE(funded_withdraw_fee_percent, 2.0)
WHERE true;

-- 4. Ensure unique name constraint on funded_account_firms for idempotent seeding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'funded_account_firms_name_key'
  ) THEN
    ALTER TABLE funded_account_firms ADD CONSTRAINT funded_account_firms_name_key UNIQUE (name);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- ignore if already exists or table not yet created
END $$;

-- 5. Seed 13 Ethiopian-Friendly Prop Firms
INSERT INTO funded_account_firms (
  name, description, website, rating, review_count,
  accepts_ethiopians, country, is_active
) VALUES
('FTMO',
 'The world''s most prestigious prop trading firm. FTMO is known for fair rules, 80-90% profit splits, and fast bi-weekly payouts. Trusted by 200,000+ traders worldwide including Ethiopians.',
 'https://ftmo.com', 4.8, 48200, true, 'Czech Republic', true),

('The5ers',
 'Leading firm with instant funding and hyper-growth scaling plans. Accepts Ethiopian traders with flexible challenge rules and a proven track record of reliable crypto payouts.',
 'https://the5ers.com', 4.7, 18900, true, 'Israel', true),

('Topstep',
 'US-based futures and forex prop firm. Topstep is premier for traders who prefer futures (ES, NQ, CL). Accepts international traders including Ethiopia via crypto.',
 'https://topstep.com', 4.5, 22000, true, 'United States', true),

('E8 Funding',
 'Competitive rules with up to 80% profit split and scaling to $1M+. E8 offers 2-step and 3-step evaluations with realistic drawdown rules.',
 'https://e8funding.com', 4.4, 9800, true, 'United Kingdom', true),

('FunderPro',
 'Next-generation prop firm featuring real funded capital and AI analytics. Accepts Ethiopian traders with unlimited trading days on evaluations.',
 'https://funderpro.com', 4.3, 6700, true, 'Malta', true),

('Alpha Capital Group',
 'European prop firm known for 0% commission on challenges, free trial accounts, and fast evaluation. Growing community across East Africa.',
 'https://alphacapitalgroup.uk', 4.2, 5400, true, 'United Kingdom', true),

('City Traders Imperium',
 'CTI is a London-based prop firm offering instant funding and evaluation accounts with dedicated mentoring for consistent traders.',
 'https://citytraderseimperium.com', 4.1, 4200, true, 'United Kingdom', true),

('Funded Next',
 'Fastest-growing prop firm in the world with guaranteed payout promises and 15% profit share even during challenge phases. Accepts Ethiopian traders.',
 'https://fundednext.com', 4.6, 14000, true, 'UAE', true),

('Maven Trading',
 'Boutique prop firm with lowest challenge prices in the industry. Accepts crypto payments and allows EA trading for Ethiopian traders.',
 'https://maventrading.io', 4.2, 2800, true, 'Canada', true),

('Funding Pips',
 'UAE-based prop firm with 5-day minimum trading days and 80-90% profit split. Highly popular in Ethiopia due to affordable evaluation fees.',
 'https://fundingpips.com', 4.5, 7600, true, 'UAE', true),

('MyFundedFX',
 'Offers same-day payouts and 1-step, 2-step, and 3-step challenges. Accepts traders from Ethiopia with full crypto payment support.',
 'https://myfundedfx.tech', 4.3, 8100, true, 'United States', true),

('Funded Engineer',
 'Engineered for algo and manual traders with generous scaling and up to 90% profit split.',
 'https://fundedengineer.com', 4.1, 2200, true, 'United States', true),

('True Forex Funds',
 'Low spreads, no time limits, and bi-weekly payouts. Popular among African forex traders.',
 'https://trueforexfunds.com', 4.4, 6400, true, 'Hungary', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  website = EXCLUDED.website,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  accepts_ethiopians = EXCLUDED.accepts_ethiopians,
  is_active = EXCLUDED.is_active;

-- 5b. Add Evaluation Type and Phase Targets to funded_account_plans if not present
ALTER TABLE funded_account_plans ADD COLUMN IF NOT EXISTS evaluation_type TEXT DEFAULT '2-Step Challenge';
ALTER TABLE funded_account_plans ADD COLUMN IF NOT EXISTS phase_1_target_percent DECIMAL DEFAULT 8.0;
ALTER TABLE funded_account_plans ADD COLUMN IF NOT EXISTS phase_2_target_percent DECIMAL DEFAULT 5.0;

-- 6. Seed Plans for FTMO
INSERT INTO funded_account_plans (firm_id, plan_name, account_size_usd, price_usd, evaluation_type, phase_1_target_percent, phase_2_target_percent, profit_split_percent, profit_target_percent, max_daily_loss_percent, max_total_loss_percent, leverage, is_popular, is_active, features)
SELECT f.id, v.plan_name, v.account_size_usd, v.price_usd, v.evaluation_type, v.phase_1_target_percent, v.phase_2_target_percent, v.profit_split_percent, v.profit_target_percent, v.max_daily_loss_percent, v.max_total_loss_percent, v.leverage, v.is_popular, true,
  ARRAY['No time limit on challenge','Bi-weekly crypto payouts','Refundable fee upon 1st payout','Free trial available']::text[]
FROM (SELECT id FROM funded_account_firms WHERE name = 'FTMO' LIMIT 1) f,
(VALUES
  ('$10,000 Challenge', 10000, 155, '2-Step Challenge', 10.0, 5.0, 80, 10, 5, 10, '1:100', false),
  ('$25,000 Challenge', 25000, 250, '2-Step Challenge', 10.0, 5.0, 80, 10, 5, 10, '1:100', false),
  ('$50,000 Challenge', 50000, 345, '2-Step Challenge', 10.0, 5.0, 80, 10, 5, 10, '1:100', true),
  ('$100,000 Challenge', 100000, 540, '2-Step Challenge', 10.0, 5.0, 80, 10, 5, 10, '1:100', true),
  ('$200,000 Challenge', 200000, 1080, '2-Step Challenge', 10.0, 5.0, 80, 10, 5, 10, '1:100', false)
) AS v(plan_name, account_size_usd, price_usd, evaluation_type, phase_1_target_percent, phase_2_target_percent, profit_split_percent, profit_target_percent, max_daily_loss_percent, max_total_loss_percent, leverage, is_popular)
WHERE f.id IS NOT NULL;

-- 7. Seed Plans for The5ers
INSERT INTO funded_account_plans (firm_id, plan_name, account_size_usd, price_usd, evaluation_type, phase_1_target_percent, phase_2_target_percent, profit_split_percent, profit_target_percent, max_daily_loss_percent, max_total_loss_percent, leverage, is_popular, is_active, features)
SELECT f.id, v.plan_name, v.account_size_usd, v.price_usd, v.evaluation_type, v.phase_1_target_percent, v.phase_2_target_percent, v.profit_split_percent, v.profit_target_percent, v.max_daily_loss_percent, v.max_total_loss_percent, v.leverage, v.is_popular, true,
  ARRAY['Instant funding available','Double account every 10%','No time limits','Live webinar support']::text[]
FROM (SELECT id FROM funded_account_firms WHERE name = 'The5ers' LIMIT 1) f,
(VALUES
  ('$5,000 Bootcamp', 5000, 95, '3-Step Bootcamp', 6.0, 6.0, 80, 6, 4, 8, '1:30', false),
  ('$20,000 High Stakes', 20000, 165, '2-Step Challenge', 8.0, 5.0, 80, 8, 5, 10, '1:100', true),
  ('$60,000 High Stakes', 60000, 395, '2-Step Challenge', 8.0, 5.0, 80, 8, 5, 10, '1:100', true),
  ('$100,000 High Stakes', 100000, 495, '2-Step Challenge', 8.0, 5.0, 80, 8, 5, 10, '1:100', false)
) AS v(plan_name, account_size_usd, price_usd, evaluation_type, phase_1_target_percent, phase_2_target_percent, profit_split_percent, profit_target_percent, max_daily_loss_percent, max_total_loss_percent, leverage, is_popular)
WHERE f.id IS NOT NULL;

-- 8. Seed Plans for Funding Pips
INSERT INTO funded_account_plans (firm_id, plan_name, account_size_usd, price_usd, evaluation_type, phase_1_target_percent, phase_2_target_percent, profit_split_percent, profit_target_percent, max_daily_loss_percent, max_total_loss_percent, leverage, is_popular, is_active, features)
SELECT f.id, v.plan_name, v.account_size_usd, v.price_usd, v.evaluation_type, v.phase_1_target_percent, v.phase_2_target_percent, v.profit_split_percent, v.profit_target_percent, v.max_daily_loss_percent, v.max_total_loss_percent, v.leverage, v.is_popular, true,
  ARRAY['Lowest entry cost in Africa','5-day payout cycle','Up to 90% profit split','Scaling up to $2M']::text[]
FROM (SELECT id FROM funded_account_firms WHERE name = 'Funding Pips' LIMIT 1) f,
(VALUES
  ('$5,000 Evaluation', 5000, 32, '2-Step Evaluation', 8.0, 5.0, 85, 8, 5, 10, '1:100', false),
  ('$10,000 Evaluation', 10000, 60, '2-Step Evaluation', 8.0, 5.0, 85, 8, 5, 10, '1:100', true),
  ('$25,000 Evaluation', 25000, 139, '2-Step Evaluation', 8.0, 5.0, 85, 8, 5, 10, '1:100', false),
  ('$50,000 Evaluation', 50000, 239, '2-Step Evaluation', 8.0, 5.0, 85, 8, 5, 10, '1:100', true),
  ('$100,000 Evaluation', 100000, 399, '2-Step Evaluation', 8.0, 5.0, 85, 8, 5, 10, '1:100', false)
) AS v(plan_name, account_size_usd, price_usd, evaluation_type, phase_1_target_percent, phase_2_target_percent, profit_split_percent, profit_target_percent, max_daily_loss_percent, max_total_loss_percent, leverage, is_popular)
WHERE f.id IS NOT NULL;

-- 9. Seed Plans for Funded Next
INSERT INTO funded_account_plans (firm_id, plan_name, account_size_usd, price_usd, evaluation_type, phase_1_target_percent, phase_2_target_percent, profit_split_percent, profit_target_percent, max_daily_loss_percent, max_total_loss_percent, leverage, is_popular, is_active, features)
SELECT f.id, v.plan_name, v.account_size_usd, v.price_usd, v.evaluation_type, v.phase_1_target_percent, v.phase_2_target_percent, v.profit_split_percent, v.profit_target_percent, v.max_daily_loss_percent, v.max_total_loss_percent, v.leverage, v.is_popular, true,
  ARRAY['15% profit share from challenge','Guaranteed payout within 24h','No minimum trading days','Swap-free accounts available']::text[]
FROM (SELECT id FROM funded_account_firms WHERE name = 'Funded Next' LIMIT 1) f,
(VALUES
  ('$15,000 Stellar 2-Step', 15000, 119, '2-Step Stellar Challenge', 8.0, 5.0, 85, 8, 5, 10, '1:100', false),
  ('$25,000 Stellar 2-Step', 25000, 199, '2-Step Stellar Challenge', 8.0, 5.0, 85, 8, 5, 10, '1:100', true),
  ('$50,000 Stellar 2-Step', 50000, 299, '2-Step Stellar Challenge', 8.0, 5.0, 85, 8, 5, 10, '1:100', true),
  ('$100,000 Stellar 2-Step', 100000, 519, '2-Step Stellar Challenge', 8.0, 5.0, 85, 8, 5, 10, '1:100', false),
  ('$200,000 Stellar 2-Step', 200000, 999, '2-Step Stellar Challenge', 8.0, 5.0, 85, 8, 5, 10, '1:100', false)
) AS v(plan_name, account_size_usd, price_usd, evaluation_type, phase_1_target_percent, phase_2_target_percent, profit_split_percent, profit_target_percent, max_daily_loss_percent, max_total_loss_percent, leverage, is_popular)
WHERE f.id IS NOT NULL;
