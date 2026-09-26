-- ============================================================
-- 020_social_order_admin_profit.sql
-- Routes social order profit directly to the Admin Wallet (system_settings.collected_fees_eth)
-- ============================================================

-- Add profit tracking columns to social_service_orders if not present
alter table public.social_service_orders
  add column if not exists profit_usd numeric(10,4) default 0,
  add column if not exists profit_credited boolean default false;

-- Function to credit profit directly to Admin Wallet and admin user accounts
create or replace function public.credit_social_profit_to_admin(
  p_order_id uuid,
  p_profit_amount numeric
)
returns void
language plpgsql
security definer
as $$
declare
  v_settings_id uuid;
  v_admin_id uuid;
begin
  if p_profit_amount is null or p_profit_amount <= 0 then
    return;
  end if;

  -- 1. Credit central Admin Platform Treasury / Wallet in system_settings
  select id into v_settings_id from public.system_settings limit 1;
  if v_settings_id is not null then
    update public.system_settings
    set collected_fees_eth = coalesce(collected_fees_eth, 0) + p_profit_amount
    where id = v_settings_id;
  end if;

  -- 2. Credit admin user balances in users table
  update public.users
  set 
    balance_usd = coalesce(balance_usd, 0) + p_profit_amount,
    eth_balance = coalesce(eth_balance, 0) + p_profit_amount
  where role = 'admin';

  -- 3. Mark the order as having its profit credited
  update public.social_service_orders
  set 
    profit_usd = p_profit_amount,
    profit_credited = true
  where id = p_order_id;

  -- 4. Record transaction log for the first admin found
  select id into v_admin_id from public.users where role = 'admin' limit 1;
  if v_admin_id is not null then
    insert into public.transactions (
      user_id,
      type,
      amount_usd,
      status,
      note,
      created_at
    ) values (
      v_admin_id,
      'admin_profit_social',
      p_profit_amount,
      'completed',
      'Net profit credited to Admin Wallet from Social Media Order ' || p_order_id::text,
      now()
    );
  end if;
end;
$$;
