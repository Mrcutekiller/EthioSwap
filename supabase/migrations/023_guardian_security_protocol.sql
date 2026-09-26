-- ============================================================
-- 023_guardian_security_protocol.sql
-- Anti-Drainer, Emergency Account Lockdown, Bybit/Binance Evacuation Vault & Security Auditing
-- ============================================================

-- 1. Add security columns to users table
alter table public.users
  add column if not exists is_security_locked boolean default false,
  add column if not exists lock_reason text default null,
  add column if not exists locked_at timestamptz default null,
  add column if not exists emergency_evac_address text default null,
  add column if not exists emergency_evac_network text default 'TRC20',
  add column if not exists emergency_address_updated_at timestamptz default null,
  add column if not exists emergency_address_timelock_until timestamptz default null,
  add column if not exists auto_evacuate_on_breach boolean default true,
  add column if not exists anti_phishing_code text default null,
  add column if not exists whitelist_only_mode boolean default false,
  add column if not exists whitelisted_addresses jsonb default '[]'::jsonb;

-- 2. Create security incidents log table for auditing
create table if not exists public.security_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  incident_type text not null,
  severity text default 'critical',
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  status text default 'active',
  created_at timestamptz default now()
);

-- Enable RLS on security_incidents
alter table public.security_incidents enable row level security;

-- Policies for security_incidents
create policy "Users can view their own security incidents"
  on public.security_incidents for select
  using (auth.uid() = user_id);

create policy "Admins can view all security incidents"
  on public.security_incidents for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

create policy "Allow insert of security incidents"
  on public.security_incidents for insert
  with check (true);

-- 3. Stored Procedure: Trigger Emergency Lockdown & Optional Evacuation to Bybit/Cold Wallet
create or replace function public.trigger_emergency_account_lock(
  p_user_id uuid,
  p_reason text default 'emergency_panic_button',
  p_auto_evacuate boolean default false
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user record;
  v_balance numeric(18,4);
  v_evac_address text;
  v_evac_network text;
  v_evac_order_id uuid;
  v_evac_executed boolean := false;
  v_admin_id uuid;
begin
  -- Fetch user
  select * into v_user from public.users where id = p_user_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  v_balance := coalesce(v_user.eth_balance, 0);
  v_evac_address := v_user.emergency_evac_address;
  v_evac_network := coalesce(v_user.emergency_evac_network, 'TRC20');

  -- 1. HARD LOCK the user account
  update public.users
  set 
    is_security_locked = true,
    lock_reason = p_reason,
    locked_at = now()
  where id = p_user_id;

  -- 2. If auto-evacuate is requested and emergency address is configured
  if p_auto_evacuate and v_evac_address is not null and length(trim(v_evac_address)) > 3 and v_balance > 0.5 then
    -- Deduct balance from user so attacker cannot steal it
    update public.users
    set eth_balance = 0
    where id = p_user_id;

    -- Create high-priority emergency evacuation withdrawal request
    insert into public.withdraw_requests (
      user_id,
      username,
      amount_eth,
      amount_usd,
      address,
      wallet_type,
      status,
      created_at
    ) values (
      p_user_id,
      v_user.username,
      v_balance / 2500,
      v_balance,
      v_evac_address,
      'EMERGENCY_EVAC_' || v_evac_network,
      'emergency_evac',
      now()
    ) returning id into v_evac_order_id;

    -- Log transaction
    insert into public.transactions (
      user_id,
      type,
      amount_usd,
      status,
      note,
      created_at
    ) values (
      p_user_id,
      'emergency_evacuation',
      v_balance,
      'completed',
      '🚨 EMERGENCY EVACUATION: Funds swept to Bybit/emergency address: ' || v_evac_address,
      now()
    );

    v_evac_executed := true;
  end if;

  -- 3. Log security incident
  insert into public.security_incidents (
    user_id,
    incident_type,
    severity,
    details,
    created_at
  ) values (
    p_user_id,
    case when v_evac_executed then 'EMERGENCY_EVACUATION_EXECUTED' else 'EMERGENCY_LOCKDOWN_ENGAGED' end,
    'critical',
    jsonb_build_object(
      'reason', p_reason,
      'evac_executed', v_evac_executed,
      'evac_address', v_evac_address,
      'evac_network', v_evac_network,
      'evac_amount_usd', case when v_evac_executed then v_balance else 0 end,
      'previous_balance', v_balance
    ),
    now()
  );

  -- 4. Create high-priority in-app notification for the user
  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    is_read,
    created_at
  ) values (
    p_user_id,
    'security_lockdown',
    '🚨 EMERGENCY LOCKDOWN ENGAGED',
    case 
      when v_evac_executed then 'Your account has been locked. Remaining balance of $' || v_balance::text || ' USD has been automatically evacuated to your registered Bybit/emergency address (' || v_evac_address || ').'
      else 'Your account has been locked due to security alert: ' || p_reason || '. All withdrawals and transfers are halted.'
    end,
    false,
    now()
  );

  -- 5. Notify Admins
  select id into v_admin_id from public.users where role = 'admin' limit 1;
  if v_admin_id is not null then
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      is_read,
      created_at
    ) values (
      v_admin_id,
      'admin_security_alert',
      '🚨 SECURITY ALERT: @' || v_user.username || ' Triggered Lockdown',
      'User @' || v_user.username || ' initiated emergency lockdown (' || p_reason || '). Evacuation executed: ' || (case when v_evac_executed then 'YES ($' || v_balance::text || ' to ' || v_evac_address || ')' else 'NO' end),
      false,
      now()
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'is_locked', true,
    'evac_executed', v_evac_executed,
    'evac_amount', case when v_evac_executed then v_balance else 0 end,
    'evac_address', v_evac_address
  );
end;
$$;

-- 4. Stored Procedure: Unlock Emergency Account (by user with verification or admin)
create or replace function public.unlock_emergency_account(
  p_user_id uuid,
  p_unlocked_by text default 'user'
)
returns jsonb
language plpgsql
security definer
as $$
begin
  update public.users
  set 
    is_security_locked = false,
    lock_reason = null,
    locked_at = null
  where id = p_user_id;

  insert into public.security_incidents (
    user_id,
    incident_type,
    severity,
    details,
    created_at
  ) values (
    p_user_id,
    'EMERGENCY_LOCKDOWN_RELEASED',
    'info',
    jsonb_build_object('unlocked_by', p_unlocked_by),
    now()
  );

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    is_read,
    created_at
  ) values (
    p_user_id,
    'security_unlocked',
    '🛡️ Security Lockdown Released',
    'Your account lockdown has been safely released. Full trading and withdrawal access has been restored.',
    false,
    now()
  );

  return jsonb_build_object('success', true, 'is_locked', false);
end;
$$;
