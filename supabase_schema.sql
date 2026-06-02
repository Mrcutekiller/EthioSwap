-- ═══════════════════════════════════════════════════════════════
-- EthioSwap Complete Supabase Schema
-- ═══════════════════════════════════════════════════════════════

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    role TEXT DEFAULT 'user',
    kyc_status TEXT DEFAULT 'none',
    kyc_step TEXT DEFAULT 'none',
    kyc_id_front TEXT,
    kyc_id_back TEXT,
    kyc_selfie TEXT,
    kyc_document TEXT,
    kyc_rejection_reason TEXT,
    kyc_data JSONB,
    phone TEXT NOT NULL,
    email TEXT UNIQUE,
    full_name TEXT,
    age INTEGER,
    eth_address TEXT NOT NULL DEFAULT '',
    eth_private_key TEXT NOT NULL DEFAULT '',
    eth_balance NUMERIC DEFAULT 0,
    eth_locked NUMERIC DEFAULT 0,
    etb_balance NUMERIC DEFAULT 0,
    binance_balance NUMERIC,
    bybit_balance NUMERIC,
    display_name TEXT NOT NULL DEFAULT '',
    bio TEXT,
    reputation NUMERIC DEFAULT 100,
    total_trades INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    payment_accounts JSONB DEFAULT '[]',
    numeric_id INTEGER UNIQUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    warnings JSONB DEFAULT '[]',
    transaction_pin TEXT,
    badge_level TEXT DEFAULT 'none',
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_trade_date TIMESTAMPTZ,
    loyalty_points INTEGER DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES users(id),
    total_invites INTEGER DEFAULT 0,
    successful_invites INTEGER DEFAULT 0,
    pending_invites INTEGER DEFAULT 0,
    total_invite_earnings NUMERIC DEFAULT 0,
    invite_earnings_month NUMERIC DEFAULT 0,
    is_verified_active BOOLEAN DEFAULT FALSE,
    profile_border TEXT,
    username_color TEXT,
    selected_avatar TEXT,
    unlocked_items JSONB DEFAULT '[]',
    security_type TEXT,
    security_enabled BOOLEAN DEFAULT FALSE,
    is_verified_trader BOOLEAN DEFAULT FALSE,
    gender TEXT,
    avg_rating NUMERIC DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    total_trades_completed INTEGER DEFAULT 0,
    preferred_language TEXT DEFAULT 'en',
    theme_preference TEXT DEFAULT 'system',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    seen_tooltips JSONB DEFAULT '[]',
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_method TEXT,
    trusted_devices JSONB DEFAULT '[]',
    last_login_device TEXT,
    last_login_location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LISTINGS TABLE
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(id) NOT NULL,
    amount_eth NUMERIC NOT NULL,
    min_limit_etb NUMERIC NOT NULL,
    max_limit_etb NUMERIC NOT NULL,
    payment_methods TEXT[] NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    custom_rate_etb NUMERIC,
    type TEXT DEFAULT 'sell',
    payment_accounts JSONB DEFAULT '[]'
);

-- 3. TRADES TABLE
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES users(id) NOT NULL,
    seller_id UUID REFERENCES users(id) NOT NULL,
    listing_id UUID REFERENCES listings(id) NOT NULL,
    amount_eth NUMERIC NOT NULL,
    amount_etb NUMERIC NOT NULL,
    status TEXT NOT NULL,
    timer_expires_at TIMESTAMPTZ,
    chat JSONB DEFAULT '[]',
    proof_url TEXT,
    proof_storage_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    dispute_reason TEXT,
    disputed_by UUID REFERENCES users(id),
    fee_eth NUMERIC,
    selected_payment_account JSONB
);

-- 4. DEPOSIT REQUESTS
CREATE TABLE IF NOT EXISTS deposit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    username TEXT NOT NULL,
    amount_usd NUMERIC NOT NULL,
    wallet_type TEXT NOT NULL,
    sender_reference TEXT NOT NULL,
    screenshot_url TEXT,
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 5. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TRANSACTIONS (Enhanced)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC,
    amount_eth NUMERIC,
    amount_usd NUMERIC,
    gross_amount NUMERIC,
    platform_fee NUMERIC DEFAULT 0,
    onchain_fee NUMERIC DEFAULT 0,
    net_amount NUMERIC,
    currency TEXT DEFAULT 'USDT',
    status TEXT DEFAULT 'completed',
    tx_hash TEXT,
    from_address TEXT,
    to_address TEXT,
    related_user_id UUID REFERENCES users(id),
    note TEXT,
    confirmation_status TEXT,
    confirmations_count INTEGER,
    admin_wallet_received BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etb_rate_per_dollar NUMERIC NOT NULL DEFAULT 190,
    etb_rate_per_dollar_sell NUMERIC,
    daily_trade_limit INTEGER,
    flat_fee_percent NUMERIC NOT NULL DEFAULT 1,
    max_fee_usd NUMERIC NOT NULL DEFAULT 0.5,
    collected_fees_eth NUMERIC DEFAULT 0,
    master_wallet_balance_eth NUMERIC DEFAULT 0,
    master_wallet_address TEXT NOT NULL DEFAULT '',
    commission_type TEXT NOT NULL DEFAULT 'percentage',
    commission_value NUMERIC NOT NULL DEFAULT 1,
    deposit_fee_percent NUMERIC DEFAULT 1.5,
    withdrawal_fee_percent NUMERIC DEFAULT 1.5,
    admin_wallet_addresses JSONB,
    min_deposit_usd NUMERIC DEFAULT 5,
    min_withdrawal_usd NUMERIC DEFAULT 5,
    max_daily_withdrawal_usd NUMERIC DEFAULT 500,
    max_internal_transfer_daily NUMERIC DEFAULT 500,
    points_per_trade INTEGER DEFAULT 10,
    referral_bonus_points INTEGER DEFAULT 50,
    streak_bonus_points INTEGER DEFAULT 5,
    is_leaderboard_enabled BOOLEAN DEFAULT FALSE,
    leaderboard_reset_date TIMESTAMPTZ,
    invite_earn_status TEXT DEFAULT 'locked',
    invite_unlock_target INTEGER DEFAULT 200,
    current_verified_users INTEGER DEFAULT 0,
    invite_reward_amount NUMERIC DEFAULT 0.5,
    max_invites_per_month INTEGER DEFAULT 50,
    min_trade_to_qualify NUMERIC DEFAULT 10,
    p2p_commission NUMERIC DEFAULT 0,
    is_p2p_free_period BOOLEAN DEFAULT TRUE,
    escrow_seller_confirm_timeout_mins INTEGER DEFAULT 120,
    auto_escalate_to_dispute BOOLEAN DEFAULT TRUE,
    force_2fa_for_withdrawals BOOLEAN DEFAULT FALSE,
    max_failed_pin_attempts INTEGER DEFAULT 3,
    lockout_duration_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. INVITE REWARDS
CREATE TABLE IF NOT EXISTS invite_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_user_id UUID REFERENCES users(id) NOT NULL,
    invited_user_id UUID REFERENCES users(id) NOT NULL,
    invite_date TIMESTAMPTZ DEFAULT NOW(),
    first_trade_date TIMESTAMPTZ,
    reward_amount NUMERIC NOT NULL,
    reward_status TEXT DEFAULT 'pending',
    paid_date TIMESTAMPTZ
);

-- 9. LOYALTY HISTORY
CREATE TABLE IF NOT EXISTS loyalty_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. REFERRALS
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id) NOT NULL,
    referred_user_id UUID REFERENCES users(id) NOT NULL,
    status TEXT DEFAULT 'pending',
    reward_given BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    username TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    messages JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. WITHDRAW REQUESTS
CREATE TABLE IF NOT EXISTS withdraw_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    username TEXT NOT NULL,
    amount_usd NUMERIC NOT NULL,
    wallet_type TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 13. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id) NOT NULL,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id UUID REFERENCES users(id),
    target_name TEXT,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TRADE CHATS
CREATE TABLE IF NOT EXISTS trade_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES trade_chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    message_text TEXT,
    image_url TEXT,
    message_type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. ESCROW ACCOUNTS
CREATE TABLE IF NOT EXISTS escrow_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES users(id) NOT NULL,
    buyer_id UUID REFERENCES users(id) NOT NULL,
    amount_usdt NUMERIC NOT NULL,
    status TEXT DEFAULT 'locked',
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. ESCROW LOGS
CREATE TABLE IF NOT EXISTS escrow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id UUID REFERENCES escrow_accounts(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES users(id) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. TRADER RATINGS
CREATE TABLE IF NOT EXISTS trader_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
    rater_id UUID REFERENCES users(id) NOT NULL,
    rated_user_id UUID REFERENCES users(id) NOT NULL,
    stars INTEGER CHECK (stars >= 1 AND stars <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trade_id, rater_id)
);

-- 19. PRICE ALERTS
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    crypto TEXT DEFAULT 'USDT',
    currency TEXT DEFAULT 'ETB',
    target_price NUMERIC NOT NULL,
    condition TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en TEXT NOT NULL,
    title_am TEXT NOT NULL DEFAULT '',
    body_en TEXT NOT NULL,
    body_am TEXT NOT NULL DEFAULT '',
    type TEXT DEFAULT 'info',
    show_as_banner BOOLEAN DEFAULT FALSE,
    send_push BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. ANNOUNCEMENT READS
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. INTERNAL TRANSFERS
CREATE TABLE IF NOT EXISTS internal_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) NOT NULL,
    receiver_id UUID REFERENCES users(id) NOT NULL,
    amount NUMERIC NOT NULL,
    note TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. DISPUTES
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
    opened_by UUID REFERENCES users(id) NOT NULL,
    against_user UUID REFERENCES users(id) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    resolution TEXT,
    admin_id UUID REFERENCES users(id),
    admin_note TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. DISPUTE EVIDENCE
CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE NOT NULL,
    uploaded_by UUID REFERENCES users(id) NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. RATE HISTORY (NEW)
CREATE TABLE IF NOT EXISTS rate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usdt_etb_rate NUMERIC NOT NULL,
    usdt_etb_rate_sell NUMERIC,
    source TEXT DEFAULT 'coingecko',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. LEADERBOARD MONTHLY (NEW)
CREATE TABLE IF NOT EXISTS leaderboard_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_volume NUMERIC DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    avg_rating NUMERIC DEFAULT 0,
    points INTEGER DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- 27. PAYMENT REQUESTS (NEW - for request money feature)
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES users(id) NOT NULL,
    target_user_id UUID REFERENCES users(id),
    target_username TEXT,
    amount NUMERIC NOT NULL,
    note TEXT,
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_numeric_id ON users(numeric_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invite_rewards_inviter ON invite_rewards(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_invite_rewards_invited ON invite_rewards(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_user_id ON loyalty_history(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status ON withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_trade_chats_trade_id ON trade_chats(trade_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_trade_id ON escrow_accounts(trade_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_status ON escrow_accounts(status);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_seller ON escrow_accounts(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_buyer ON escrow_accounts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trader_ratings_rated_user ON trader_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_trader_ratings_trade ON trader_ratings(trade_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active, is_triggered);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_transfers_sender ON internal_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_internal_transfers_receiver ON internal_transfers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_disputes_trade_id ON disputes(trade_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON disputes(opened_by);
CREATE INDEX IF NOT EXISTS idx_rate_history_recorded ON rate_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_monthly_period ON leaderboard_monthly(year, month);
CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_target ON payment_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trader_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all users" ON users FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Listings policies
CREATE POLICY "Anyone can view active listings" ON listings FOR SELECT USING (status = 'active');
CREATE POLICY "Users can create listings" ON listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update own listings" ON listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Users can delete own listings" ON listings FOR DELETE USING (auth.uid() = seller_id);

-- Trades policies
CREATE POLICY "Users can view own trades" ON trades FOR SELECT USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can create trades" ON trades FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Users can update own trades" ON trades FOR UPDATE USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Trade chats policies
CREATE POLICY "Trade participants can view chats" ON trade_chats FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM trades t
        WHERE t.id = trade_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    ) OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System can create chats" ON trade_chats FOR INSERT WITH CHECK (true);

-- Chat messages policies
CREATE POLICY "Chat participants can view messages" ON chat_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM trade_chats tc
        JOIN trades t ON t.id = tc.trade_id
        WHERE tc.id = chat_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    ) OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Chat participants can send messages" ON chat_messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
        SELECT 1 FROM trade_chats tc
        JOIN trades t ON t.id = tc.trade_id
        WHERE tc.id = chat_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
);
CREATE POLICY "Users can update own message read status" ON chat_messages FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM trade_chats tc
        JOIN trades t ON t.id = tc.trade_id
        WHERE tc.id = chat_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
);

-- Escrow policies
CREATE POLICY "Trade participants can view escrow" ON escrow_accounts FOR SELECT USING (
    auth.uid() = seller_id OR auth.uid() = buyer_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System can create escrow" ON escrow_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update escrow" ON escrow_accounts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Escrow logs policies
CREATE POLICY "Trade participants can view escrow logs" ON escrow_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM escrow_accounts ea
        WHERE ea.id = escrow_id AND (ea.seller_id = auth.uid() OR ea.buyer_id = auth.uid())
    ) OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Trader ratings policies
CREATE POLICY "Anyone can view ratings" ON trader_ratings FOR SELECT USING (true);
CREATE POLICY "Users can create ratings" ON trader_ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Price alerts policies
CREATE POLICY "Users can manage own alerts" ON price_alerts FOR ALL USING (auth.uid() = user_id);

-- Announcements policies
CREATE POLICY "Anyone can view published announcements" ON announcements FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Announcement reads policies
CREATE POLICY "Users can view own reads" ON announcement_reads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark as read" ON announcement_reads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Internal transfers policies
CREATE POLICY "Users can view own transfers" ON internal_transfers FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Users can create transfers" ON internal_transfers FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Disputes policies
CREATE POLICY "Trade participants can view disputes" ON disputes FOR SELECT USING (
    auth.uid() = opened_by OR auth.uid() = against_user OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can create disputes" ON disputes FOR INSERT WITH CHECK (auth.uid() = opened_by);
CREATE POLICY "Admin can update disputes" ON disputes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Dispute evidence policies
CREATE POLICY "Dispute participants can view evidence" ON dispute_evidence FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM disputes d
        WHERE d.id = dispute_id AND (d.opened_by = auth.uid() OR d.against_user = auth.uid())
    ) OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Dispute participants can upload evidence" ON dispute_evidence FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
);

-- Rate history policies
CREATE POLICY "Anyone can view rate history" ON rate_history FOR SELECT USING (true);

-- Leaderboard policies
CREATE POLICY "Anyone can view leaderboard" ON leaderboard_monthly FOR SELECT USING (true);

-- Payment requests policies
CREATE POLICY "Users can view own payment requests" ON payment_requests FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = target_user_id
);
CREATE POLICY "Users can create payment requests" ON payment_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Target user can update payment request" ON payment_requests FOR UPDATE USING (auth.uid() = target_user_id);

-- Deposit requests policies
CREATE POLICY "Users can view own deposit requests" ON deposit_requests FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can create deposit requests" ON deposit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Withdraw requests policies
CREATE POLICY "Users can view own withdraw requests" ON withdraw_requests FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can create withdraw requests" ON withdraw_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Support tickets policies
CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ═══════════════════════════════════════════════════════════════
-- DATABASE FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Function: Update user avg_rating and total_ratings after new rating
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET
        avg_rating = (SELECT COALESCE(AVG(stars), 0) FROM trader_ratings WHERE rated_user_id = NEW.rated_user_id),
        total_ratings = (SELECT COUNT(*) FROM trader_ratings WHERE rated_user_id = NEW.rated_user_id)
    WHERE id = NEW.rated_user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_rating_created
    AFTER INSERT ON trader_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating();

-- Function: Update user total_trades_completed after trade completion
CREATE OR REPLACE FUNCTION update_trade_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE users SET
            total_trades_completed = total_trades_completed + 1,
            total_trades = total_trades + 1,
            last_trade_date = NOW()
        WHERE id = NEW.buyer_id;
        UPDATE users SET
            total_trades_completed = total_trades_completed + 1,
            total_trades = total_trades + 1,
            last_trade_date = NOW()
        WHERE id = NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_status_change
    AFTER UPDATE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_count();

-- Function: Auto-close chat when trade is completed/cancelled
CREATE OR REPLACE FUNCTION close_chat_on_trade_end()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('completed', 'cancelled') AND OLD.status NOT IN ('completed', 'cancelled') THEN
        UPDATE trade_chats SET status = 'closed' WHERE trade_id = NEW.id AND status = 'active';
    END IF;
    IF NEW.status = 'disputed' AND OLD.status != 'disputed' THEN
        UPDATE trade_chats SET status = 'disputed' WHERE trade_id = NEW.id AND status = 'active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_end
    AFTER UPDATE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION close_chat_on_trade_end();

-- Function: Auto-assign badge level based on trades and rating
CREATE OR REPLACE FUNCTION check_badge_upgrade()
RETURNS TRIGGER AS $$
DECLARE
    new_badge TEXT;
BEGIN
    IF NEW.total_trades_completed >= 100 AND NEW.avg_rating >= 4.9 THEN
        new_badge := 'elite';
    ELSIF NEW.total_trades_completed >= 50 AND NEW.avg_rating >= 4.8 THEN
        new_badge := 'top_rated';
    ELSIF NEW.total_trades_completed >= 20 AND NEW.avg_rating >= 4.0 THEN
        new_badge := 'trusted';
    ELSIF NEW.total_trades_completed >= 1 THEN
        new_badge := 'new_trader';
    ELSE
        new_badge := 'none';
    END IF;

    IF new_badge != NEW.badge_level THEN
        NEW.badge_level := new_badge;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_stats_change
    BEFORE UPDATE OF total_trades_completed, avg_rating ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_badge_upgrade();

-- Function: Mark chat messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_chat_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE chat_messages SET is_read = TRUE
    WHERE chat_id = p_chat_id AND sender_id != p_user_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- REALTIME PUBLICATIONS
-- ═══════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE listings;
ALTER PUBLICATION supabase_realtime ADD TABLE escrow_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE disputes;

-- ═══════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('chat-images', 'chat-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
    ('dispute-evidence', 'dispute-evidence', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
    ('kyc-documents', 'kyc-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
    ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload chat images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'chat-images');
CREATE POLICY "Anyone can view chat images" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-images');

CREATE POLICY "Authenticated can upload dispute evidence" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'dispute-evidence' AND auth.role() = 'authenticated');
CREATE POLICY "Dispute participants can view evidence" ON storage.objects
    FOR SELECT USING (bucket_id = 'dispute-evidence');

CREATE POLICY "Authenticated can upload KYC" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Admin can view KYC" ON storage.objects
    FOR SELECT USING (bucket_id = 'kyc-documents');

CREATE POLICY "Anyone can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════
INSERT INTO system_settings (
    etb_rate_per_dollar, etb_rate_per_dollar_sell, flat_fee_percent, max_fee_usd,
    master_wallet_address, commission_type, commission_value,
    invite_earn_status, invite_unlock_target, invite_reward_amount,
    p2p_commission, is_p2p_free_period,
    deposit_fee_percent, withdrawal_fee_percent,
    min_deposit_usd, min_withdrawal_usd, max_daily_withdrawal_usd,
    max_internal_transfer_daily
) VALUES (
    190.0, 186.0, 1.0, 0.5,
    '0x71C259654103112E118830F25f82bb54aA20336d', 'percentage', 1.0,
    'locked', 200, 0.5,
    0, TRUE,
    1.5, 1.5,
    5, 5, 500,
    500
) ON CONFLICT DO NOTHING;
