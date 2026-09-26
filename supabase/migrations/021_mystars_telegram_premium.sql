-- ============================================================
-- 021_mystars_telegram_premium.sql
-- Adds MyStars API configuration & Telegram Premium provider metadata
-- ============================================================

-- Add MyStars configuration to system_settings
alter table public.system_settings
  add column if not exists mystars_api_key text default 'faas_2a19ef9912dea131431f9d643fdddd0a9370956e2b9deb5dff4c590191f438e1',
  add column if not exists mystars_webhook_secret text default 'a516b73beb2e49fca4d438b5cf7d1b0492c770ffc3e1d9e80021af77ff0de4b8',
  add column if not exists mystars_base_url text default 'https://api.mystars.tg';

-- Update existing system_settings record with the provided MyStars credentials
update public.system_settings
set 
  mystars_api_key = coalesce(mystars_api_key, 'faas_2a19ef9912dea131431f9d643fdddd0a9370956e2b9deb5dff4c590191f438e1'),
  mystars_webhook_secret = coalesce(mystars_webhook_secret, 'a516b73beb2e49fca4d438b5cf7d1b0492c770ffc3e1d9e80021af77ff0de4b8'),
  mystars_base_url = coalesce(mystars_base_url, 'https://api.mystars.tg');

-- Add provider order response details to social_service_orders
alter table public.social_service_orders
  add column if not exists provider_response jsonb,
  add column if not exists payment_address text,
  add column if not exists payment_memo text;
