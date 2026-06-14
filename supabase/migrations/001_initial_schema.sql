-- EthioSwap Supabase Schema (Idempotent - safe to re-run)
-- Migrated from Convex backend

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING TABLES (cascade foreign keys)
-- ============================================
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS otp_attempts_logs CASCADE;
DROP TABLE IF EXISTS otps CASCADE;
DROP TABLE IF EXISTS dispute_audit_logs CASCADE;
DROP TABLE IF EXISTS rate_history CASCADE;
DROP TABLE IF EXISTS login_otps CASCADE;
DROP TABLE IF EXISTS trade_ratings CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS withdraw_requests CASCADE;
DROP TABLE IF EXISTS deposit_requests CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS admin_audit_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS trusted_devices CASCADE;
DROP TABLE IF EXISTS telegram_link_tokens CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_last_active();

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  full_name TEXT,
  display_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  password_hash TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending_verification', 'suspended')),
  age INTEGER,
  bio TEXT,
  country TEXT,
  city TEXT,
  work TEXT,
  profile_pic TEXT,
  balance_usd DECIMAL DEFAULT 0,
  balance_escrow DECIMAL DEFAULT 0,
  etb_balance DECIMAL DEFAULT 0,
  eth_balance DECIMAL DEFAULT 0,
  eth_locked DECIMAL DEFAULT 0,
  trade_count INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  total_volume DECIMAL DEFAULT 0,
  reputation INTEGER DEFAULT 100,
  eth_address TEXT,
  eth_private_key TEXT,
  kyc_status TEXT DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'submitted', 'approved', 'rejected')),
  kyc_rejection_reason TEXT,
  kyc_id_image TEXT,
  kyc_selfie TEXT,
  kyc_step TEXT,
  kyc_data JSONB,
  kyc_full_name TEXT,
  kyc_dob TEXT,
  kyc_rejected_count INTEGER DEFAULT 0,
  kyc_id_front TEXT,
  kyc_id_back TEXT,
  kyc_document JSONB,
  is_verified_trader BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  numeric_id SERIAL,
  two_fa_enabled BOOLEAN DEFAULT FALSE,
  two_fa_method TEXT,
  theme_preference TEXT,
  preferred_language TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  preferred_verification_method TEXT,
  sms_enabled BOOLEAN DEFAULT FALSE,
  telegram_enabled BOOLEAN DEFAULT FALSE,
  email_enabled BOOLEAN DEFAULT FALSE,
  loyalty_points INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  telegram_chat_id TEXT,
  telegram_link_code TEXT,
  telegram_link_expires BIGINT,
  telegram_linked BOOLEAN DEFAULT FALSE,
  telegram_link_token TEXT,
  telegram_connected BOOLEAN DEFAULT FALSE,
  telegram_connected_at TEXT,
  otp_failures INTEGER DEFAULT 0,
  otp_locked_until BIGINT,
  payment_accounts JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- LISTINGS TABLE
-- ============================================
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount_eth DECIMAL,
  min_limit_etb DECIMAL,
  max_limit_etb DECIMAL,
  payment_methods JSONB DEFAULT '[]',
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  custom_rate_etb DECIMAL,
  payment_accounts JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_seller ON listings(seller_id);

-- ============================================
-- TRADES TABLE
-- ============================================
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  type TEXT,
  amount_usd DECIMAL,
  amount_eth DECIMAL,
  amount_etb DECIMAL,
  fee_eth DECIMAL,
  rate DECIMAL,
  min_amount DECIMAL,
  max_amount DECIMAL,
  payment_method TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'payment_pending', 'paid', 'completed', 'cancelled', 'disputed', 'expired')),
  escrow_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_trades_buyer ON trades(buyer_id);
CREATE INDEX idx_trades_seller ON trades(seller_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_listing ON trades(listing_id);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount_usd DECIMAL,
  amount_usd_legacy DECIMAL,
  amount_eth_legacy DECIMAL,
  amount_etb DECIMAL,
  method TEXT,
  status TEXT,
  tx_hash TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  username TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_approved ON reviews(is_approved);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- ============================================
-- DISPUTES TABLE
-- ============================================
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
  opened_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  buyer_evidence JSONB DEFAULT '[]',
  seller_evidence JSONB DEFAULT '[]',
  admin_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution TEXT,
  split_buyer_percent DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_trade ON disputes(trade_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================
-- EXCHANGE RATES TABLE
-- ============================================
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buy_rate DECIMAL NOT NULL,
  sell_rate DECIMAL NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etb_rate_per_dollar DECIMAL NOT NULL,
  etb_rate_per_dollar_sell DECIMAL,
  flat_fee_percent DECIMAL,
  max_fee_usd DECIMAL,
  commission_type TEXT,
  commission_value DECIMAL,
  is_p2p_free_period BOOLEAN DEFAULT FALSE,
  deposit_fee_percent DECIMAL,
  withdrawal_fee_percent DECIMAL,
  min_deposit_usd DECIMAL,
  min_withdrawal_usd DECIMAL,
  min_p2p_listing_usd DECIMAL,
  max_daily_withdrawal_usd DECIMAL,
  points_per_trade INTEGER DEFAULT 0,
  is_leaderboard_enabled BOOLEAN DEFAULT FALSE,
  collected_fees_eth DECIMAL DEFAULT 0,
  master_wallet_address TEXT,
  master_wallet_balance_eth DECIMAL DEFAULT 0,
  is_sms_channel_disabled BOOLEAN DEFAULT FALSE,
  is_telegram_channel_disabled BOOLEAN DEFAULT FALSE,
  is_email_channel_disabled BOOLEAN DEFAULT FALSE,
  referral_bonus_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADMIN AUDIT LOGS TABLE
-- ============================================
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);

-- ============================================
-- SUPPORT TICKETS TABLE
-- ============================================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  username TEXT,
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- ============================================
-- DEPOSIT REQUESTS TABLE
-- ============================================
CREATE TABLE deposit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount_usd DECIMAL,
  amount_usd_legacy DECIMAL,
  amount_eth DECIMAL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  username TEXT,
  wallet_type TEXT,
  sender_reference TEXT
);

CREATE INDEX idx_deposit_requests_user ON deposit_requests(user_id);
CREATE INDEX idx_deposit_requests_status ON deposit_requests(status);

-- ============================================
-- WITHDRAW REQUESTS TABLE
-- ============================================
CREATE TABLE withdraw_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount_eth DECIMAL,
  amount_usd DECIMAL,
  address TEXT,
  destination_address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  username TEXT,
  wallet_address TEXT,
  wallet_type TEXT,
  network TEXT
);

CREATE INDEX idx_withdraw_requests_user ON withdraw_requests(user_id);
CREATE INDEX idx_withdraw_requests_status ON withdraw_requests(status);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
  sender_id TEXT NOT NULL,
  sender_username TEXT,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_trade ON messages(trade_id);

-- ============================================
-- TRADE RATINGS TABLE
-- ============================================
CREATE TABLE trade_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
  rater_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  rated_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  rater_type TEXT NOT NULL CHECK (rater_type IN ('buyer', 'seller')),
  low_rating_reason TEXT,
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trade_ratings_trade ON trade_ratings(trade_id);
CREATE INDEX idx_trade_ratings_rated ON trade_ratings(rated_id);
CREATE INDEX idx_trade_ratings_rater ON trade_ratings(rater_id);

-- ============================================
-- LOGIN OTPS TABLE
-- ============================================
CREATE TABLE login_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  otp_code TEXT NOT NULL,
  telegram_chat_id TEXT,
  expires_at BIGINT NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_otps_user ON login_otps(user_id);
CREATE INDEX idx_login_otps_code ON login_otps(otp_code);
CREATE INDEX idx_login_otps_expires ON login_otps(expires_at);

-- ============================================
-- DISPUTE AUDIT LOGS TABLE
-- ============================================
CREATE TABLE dispute_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  admin_username TEXT NOT NULL,
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dispute_audit_logs_trade ON dispute_audit_logs(trade_id);

-- ============================================
-- RATE HISTORY TABLE
-- ============================================
CREATE TABLE rate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buy_rate DECIMAL NOT NULL,
  sell_rate DECIMAL NOT NULL,
  average_rate DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_history_created ON rate_history(created_at);

-- ============================================
-- NOTIFICATION LOGS TABLE
-- ============================================
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'telegram', 'in_app', 'email')),
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'failed', 'pending')),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);

-- ============================================
-- OTPS TABLE
-- ============================================
CREATE TABLE otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'signup', 'withdrawal', 'sensitive_change')),
  code TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  attempts INTEGER DEFAULT 0,
  resends INTEGER DEFAULT 0,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'telegram', 'email')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'invalidated')),
  used BOOLEAN DEFAULT FALSE,
  created_at_epoch BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otps_user_purpose_status ON otps(user_id, purpose, status);

-- ============================================
-- OTP ATTEMPTS LOGS TABLE
-- ============================================
CREATE TABLE otp_attempts_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  purpose TEXT NOT NULL,
  code_entered TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed_expired', 'failed_incorrect', 'failed_not_found')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_attempts_logs_user ON otp_attempts_logs(user_id);

-- ============================================
-- TRUSTED DEVICES TABLE
-- ============================================
CREATE TABLE trusted_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT NOT NULL,
  location TEXT,
  trusted_until BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trusted_devices_user_fingerprint ON trusted_devices(user_id, device_fingerprint);

-- ============================================
-- TELEGRAM LINK TOKENS TABLE
-- ============================================
CREATE TABLE telegram_link_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_telegram_link_tokens_user ON telegram_link_tokens(user_id);
CREATE INDEX idx_telegram_link_tokens_token ON telegram_link_tokens(token);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_attempts_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (is_admin());

CREATE POLICY "Anyone can view active listings" ON listings
  FOR SELECT USING (status = 'active');

CREATE POLICY "Sellers can view own listings" ON listings
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create listings" ON listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own listings" ON listings
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage all listings" ON listings
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Admins can manage all trades" ON trades
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view approved reviews" ON reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews" ON reviews
  FOR ALL USING (
    is_admin()
  );

CREATE POLICY "Users can view own disputes" ON disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.id = disputes.trade_id 
      AND (trades.buyer_id = auth.uid() OR trades.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can create disputes" ON disputes
  FOR INSERT WITH CHECK (auth.uid() = opened_by);

CREATE POLICY "Admins can manage all disputes" ON disputes
  FOR ALL USING (
    is_admin()
  );

CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" ON support_tickets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tickets" ON support_tickets
  FOR ALL USING (
    is_admin()
  );

CREATE POLICY "Users can view own deposits" ON deposit_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create deposits" ON deposit_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all deposits" ON deposit_requests
  FOR ALL USING (
    is_admin()
  );

CREATE POLICY "Users can view own withdrawals" ON withdraw_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawals" ON withdraw_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdrawals" ON withdraw_requests
  FOR ALL USING (
    is_admin()
  );

CREATE POLICY "Users can view trade messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.id = messages.trade_id 
      AND (trades.buyer_id = auth.uid() OR trades.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.id = messages.trade_id 
      AND (trades.buyer_id = auth.uid() OR trades.seller_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can view trade ratings" ON trade_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can create ratings for own trades" ON trade_ratings
  FOR INSERT WITH CHECK (
    auth.uid() = rater_id AND
    EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.id = trade_ratings.trade_id 
      AND (trades.buyer_id = auth.uid() OR trades.seller_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can view system settings" ON system_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update system settings" ON system_settings
  FOR UPDATE USING (
    is_admin()
  );

CREATE POLICY "Anyone can view exchange rates" ON exchange_rates
  FOR SELECT USING (true);

CREATE POLICY "Admins can update exchange rates" ON exchange_rates
  FOR UPDATE USING (
    is_admin()
  );

CREATE POLICY "Anyone can view rate history" ON rate_history
  FOR SELECT USING (true);

CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own devices" ON trusted_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own devices" ON trusted_devices
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "System can manage OTPs" ON otps
  FOR ALL USING (true);

CREATE POLICY "System can manage login OTPs" ON login_otps
  FOR ALL USING (true);

CREATE POLICY "Admins can view audit logs" ON admin_audit_logs
  FOR SELECT USING (
    is_admin()
  );

CREATE POLICY "System can create audit logs" ON admin_audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own notification logs" ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notification logs" ON notification_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- GRANT ACCESS TO API
-- ============================================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email, full_name, role, status, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    'active',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-confirm all new signups (no email verification needed)
CREATE OR REPLACE FUNCTION handle_new_user_auto_confirm()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_auto_confirm();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users SET last_active = NOW() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INSERT DEFAULT SYSTEM SETTINGS
-- ============================================
INSERT INTO system_settings (
  etb_rate_per_dollar, etb_rate_per_dollar_sell, flat_fee_percent, max_fee_usd,
  commission_type, commission_value, is_p2p_free_period, deposit_fee_percent,
  withdrawal_fee_percent, min_deposit_usd, min_withdrawal_usd, min_p2p_listing_usd,
  max_daily_withdrawal_usd, points_per_trade, is_leaderboard_enabled,
  collected_fees_eth, master_wallet_address, master_wallet_balance_eth, referral_bonus_points
) VALUES (
  55.0, 57.0, 0.0, 0.0, 'percentage', 0.0, false, 0.0, 0.0, 1.0, 1.0, 10.0, 1000.0, 10, true, 0.0, '', 0.0, 50
);

-- ============================================
-- CREATE ADMIN USER
-- Run this AFTER the above schema is created.
-- Sign up via the app with email: admin@ethioswap.com
-- The app code checks if email contains "admin" to assign admin role.
-- ============================================

-- Alternative: Create admin directly via Supabase Dashboard:
-- 1. Go to Authentication → Users → Add User
-- 2. Email: admin@ethioswap.com
-- 3. Password: Admin123!
-- 4. Then update the role in the users table:
-- UPDATE users SET role = 'admin' WHERE email = 'admin@ethioswap.com';
