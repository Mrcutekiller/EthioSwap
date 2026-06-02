-- Supabase Schema for EthioSwap

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
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
    eth_address TEXT NOT NULL,
    eth_private_key TEXT NOT NULL,
    eth_balance NUMERIC DEFAULT 0,
    eth_locked NUMERIC DEFAULT 0,
    etb_balance NUMERIC DEFAULT 0,
    binance_balance NUMERIC,
    bybit_balance NUMERIC,
    display_name TEXT NOT NULL,
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
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_method TEXT, -- 'sms', 'email', 'authenticator'
    trusted_devices JSONB DEFAULT '[]',
    last_login_device TEXT,
    last_login_location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
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

-- 6. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    type TEXT NOT NULL,
    amount_eth NUMERIC,
    amount_usd NUMERIC,
    gross_amount NUMERIC,
    platform_fee NUMERIC,
    onchain_fee NUMERIC,
    net_amount NUMERIC,
    note TEXT NOT NULL,
    tx_hash TEXT,
    confirmation_status TEXT,
    confirmations_count INTEGER,
    admin_wallet_received BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etb_rate_per_dollar NUMERIC NOT NULL,
    etb_rate_per_dollar_sell NUMERIC,
    daily_trade_limit INTEGER,
    flat_fee_percent NUMERIC NOT NULL,
    max_fee_usd NUMERIC NOT NULL,
    collected_fees_eth NUMERIC DEFAULT 0,
    master_wallet_balance_eth NUMERIC DEFAULT 0,
    master_wallet_address TEXT NOT NULL,
    commission_type TEXT NOT NULL,
    commission_value NUMERIC NOT NULL,
    deposit_fee_percent NUMERIC,
    withdrawal_fee_percent NUMERIC,
    admin_wallet_addresses JSONB,
    min_deposit_usd NUMERIC,
    min_withdrawal_usd NUMERIC,
    max_daily_withdrawal_usd NUMERIC,
    points_per_trade INTEGER,
    referral_bonus_points INTEGER,
    streak_bonus_points INTEGER,
    is_leaderboard_enabled BOOLEAN DEFAULT FALSE,
    leaderboard_reset_date TIMESTAMPTZ,
    invite_earn_status TEXT DEFAULT 'locked',
    invite_unlock_target INTEGER DEFAULT 200,
    current_verified_users INTEGER DEFAULT 0,
    invite_reward_amount NUMERIC DEFAULT 0.5,
    p2p_commission NUMERIC DEFAULT 0,
    is_p2p_free_period BOOLEAN DEFAULT TRUE,
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
    status TEXT DEFAULT 'active', -- 'active', 'closed', 'disputed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES trade_chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    message_text TEXT,
    image_url TEXT,
    message_type TEXT NOT NULL, -- 'text', 'image', 'system'
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
    status TEXT DEFAULT 'locked', -- 'locked', 'released', 'refunded', 'disputed'
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. ESCROW LOGS
CREATE TABLE IF NOT EXISTS escrow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id UUID REFERENCES escrow_accounts(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL, -- 'locked', 'released', 'refunded', 'disputed'
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. PRICE ALERTS
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    crypto TEXT DEFAULT 'USDT',
    currency TEXT DEFAULT 'ETB',
    target_price NUMERIC NOT NULL,
    condition TEXT NOT NULL, -- 'above', 'below'
    is_active BOOLEAN DEFAULT TRUE,
    is_triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en TEXT NOT NULL,
    title_am TEXT NOT NULL,
    body_en TEXT NOT NULL,
    body_am TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'urgent'
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
    status TEXT DEFAULT 'completed', -- 'completed', 'cancelled', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. DISPUTES
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
    opened_by UUID REFERENCES users(id) NOT NULL,
    against_user UUID REFERENCES users(id) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'under_review', 'resolved', 'closed'
    resolution TEXT, -- 'buyer_wins', 'seller_wins', 'split', 'cancelled'
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
    file_type TEXT NOT NULL, -- 'image', 'pdf'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_trade_chats_trade_id ON trade_chats(trade_id);
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_escrow_accounts_trade_id ON escrow_accounts(trade_id);
CREATE INDEX idx_trader_ratings_rated_user ON trader_ratings(rated_user_id);
CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_announcements_published ON announcements(is_published);
CREATE INDEX idx_internal_transfers_sender ON internal_transfers(sender_id);
CREATE INDEX idx_internal_transfers_receiver ON internal_transfers(receiver_id);
CREATE INDEX idx_disputes_trade_id ON disputes(trade_id);

-- REALTIME ENABLING (Execute these in Supabase Dashboard)
-- alter publication supabase_realtime add table chat_messages;
-- alter publication supabase_realtime add table trade_chats;
-- alter publication supabase_realtime add table notifications;

-- INDEXES
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_numeric_id ON users(numeric_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_invite_rewards_inviter ON invite_rewards(inviter_user_id);
CREATE INDEX idx_invite_rewards_invited ON invite_rewards(invited_user_id);
CREATE INDEX idx_loyalty_history_user_id ON loyalty_history(user_id);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_withdraw_requests_status ON withdraw_requests(status);
CREATE INDEX idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);

-- SEED DATA (Default System Settings)
INSERT INTO system_settings (
    etb_rate_per_dollar,
    etb_rate_per_dollar_sell,
    flat_fee_percent,
    max_fee_usd,
    master_wallet_address,
    commission_type,
    commission_value,
    invite_earn_status,
    invite_unlock_target,
    invite_reward_amount,
    p2p_commission,
    is_p2p_free_period
) VALUES (
    190.0,
    186.0,
    1.0,
    0.5,
    '0x71C259654103112E118830F25f82bb54aA20336d',
    'percentage',
    1.0,
    'locked',
    200,
    0.5,
    0,
    TRUE
) ON CONFLICT DO NOTHING;
