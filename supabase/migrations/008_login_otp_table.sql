-- Login OTP table for email 2FA verification on every login
CREATE TABLE IF NOT EXISTS login_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_login_otps_user ON login_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_login_otps_email ON login_otps(email);
CREATE INDEX IF NOT EXISTS idx_login_otps_expires ON login_otps(expires_at);

-- Enable RLS
ALTER TABLE login_otps ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/update their own OTPs
CREATE POLICY "Users can read own OTPs" ON login_otps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own OTPs" ON login_otps
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything (needed for insert from edge function / server)
CREATE POLICY "Service role full access" ON login_otps
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-cleanup: delete expired OTPs older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM login_otps WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
