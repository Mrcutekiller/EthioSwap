-- Add provider_cost_usd column for tracking actual cost vs user-paid price
alter table public.social_service_orders
  add column if not exists provider_cost_usd numeric(10,4),
  add column if not exists provider_order_id  text;   -- SMM panel order ID for status polling

-- Add SMM config columns to system_settings
alter table public.system_settings
  add column if not exists smm_api_url         text,
  add column if not exists smm_api_key         text,
  add column if not exists smm_commission_pct  numeric(5,2) default 30;