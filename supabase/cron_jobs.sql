-- ═══════════════════════════════════════════════════════════════
-- Supabase Cron Jobs (pg_cron)
-- Run these in Supabase SQL Editor after enabling pg_cron extension
-- ═══════════════════════════════════════════════════════════════

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Check price alerts every 5 minutes
SELECT cron.schedule(
  'check-price-alerts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-price-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- 2. Save rate history every 15 minutes
SELECT cron.schedule(
  'save-rate-history',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/save-rate-history',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- 3. Check streaks daily at midnight
SELECT cron.schedule(
  'check-streak',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-streak',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- 4. Process escrow reminders every 30 minutes
SELECT cron.schedule(
  'process-escrow-reminders',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-escrow-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- 5. Send streak reminders daily at 6PM
SELECT cron.schedule(
  'send-streak-reminders',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-streak-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- 6. Check badge upgrades after every trade (trigger-based, not cron)
-- Handled by database trigger: on_user_stats_change

-- 7. Monthly leaderboard reset on 1st of every month
SELECT cron.schedule(
  'monthly-leaderboard-reset',
  '0 2 1 * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/monthly-leaderboard-reset',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- 8. Check invite unlock daily at midnight
SELECT cron.schedule(
  'check-invite-unlock',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-invite-unlock',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
