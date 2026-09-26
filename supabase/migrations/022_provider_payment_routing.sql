-- ============================================================
-- 022_provider_payment_routing.sql
-- Routes commission directly to Admin Wallet and real wholesale cost to Provider Payment Pool
-- ============================================================

-- 1. Add provider_payment_reserve_usd to system_settings if not present
alter table public.system_settings
  add column if not exists provider_payment_reserve_usd numeric(12,4) default 0;

-- 2. Add payment_status to social_service_orders if not present
alter table public.social_service_orders
  add column if not exists payment_status text default 'pending';

-- 3. Dedicated PL/pgSQL function to atomically route commission & real wholesale cost
create or replace function public.route_social_order_funds(
  p_order_id uuid,
  p_commission_amount numeric,
  p_wholesale_cost numeric
)
returns void
language plpgsql
security definer
as $$
declare
  v_settings_id uuid;
  v_admin_id uuid;
begin
  -- 1. Route Commission to Admin Platform Treasury & Real Wholesale Cost to Payment Reserve
  select id into v_settings_id from public.system_settings limit 1;
  if v_settings_id is not null then
    update public.system_settings
    set 
      collected_fees_eth = coalesce(collected_fees_eth, 0) + coalesce(p_commission_amount, 0),
      provider_payment_reserve_usd = coalesce(provider_payment_reserve_usd, 0) + coalesce(p_wholesale_cost, 0)
    where id = v_settings_id;
  end if;

  -- 2. Credit Admin user balance with the Commission
  if p_commission_amount is not null and p_commission_amount > 0 then
    update public.users
    set 
      balance_usd = coalesce(balance_usd, 0) + p_commission_amount,
      eth_balance = coalesce(eth_balance, 0) + p_commission_amount
    where role = 'admin';
  end if;

  -- 3. Update order record with commission, cost, and reserved status
  update public.social_service_orders
  set 
    profit_usd = coalesce(p_commission_amount, 0),
    provider_cost_usd = coalesce(p_wholesale_cost, 0),
    profit_credited = true,
    payment_status = 'reserved'
  where id = p_order_id;

  -- 4. Record transactions in ledger for auditability
  select id into v_admin_id from public.users where role = 'admin' limit 1;
  if v_admin_id is not null then
    if p_commission_amount is not null and p_commission_amount > 0 then
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
        p_commission_amount,
        'completed',
        'My Commission credited to Admin Wallet for order #' || p_order_id::text,
        now()
      );
    end if;

    if p_wholesale_cost is not null and p_wholesale_cost > 0 then
      insert into public.transactions (
        user_id,
        type,
        amount_usd,
        status,
        note,
        created_at
      ) values (
        v_admin_id,
        'provider_payment_reserve',
        p_wholesale_cost,
        'completed',
        'Real wholesale price allocated to Provider Payment Reserve for order #' || p_order_id::text,
        now()
      );
    end if;
  end if;
end;
$$;
