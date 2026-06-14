-- Admin withdrawals table
CREATE TABLE IF NOT EXISTS admin_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount_usd DECIMAL NOT NULL,
  amount_eth DECIMAL,
  destination_address TEXT,
  network TEXT DEFAULT 'TRC20',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_withdrawals_admin ON admin_withdrawals(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_withdrawals_status ON admin_withdrawals(status);
