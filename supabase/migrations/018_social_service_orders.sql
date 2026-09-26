-- ============================================================
-- 018_social_service_orders.sql
-- Social media service orders (Telegram, TikTok, Instagram)
-- ============================================================

create table if not exists public.social_service_orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  platform      text not null check (platform in ('telegram','tiktok','instagram')),
  service_id    text not null,
  service_label text not null,
  icon          text,
  target        text not null,        -- URL or @username
  comment       text,                 -- custom comment text (optional)
  qty           integer not null default 1,
  unit          text,                 -- e.g. '1,000'
  total_usd     numeric(10,4) not null,
  total_etb     numeric(12,2),
  pay_method    text not null default 'wallet' check (pay_method in ('wallet','telebirr')),
  status        text not null default 'pending'
                  check (status in ('pending','processing','completed','cancelled')),
  admin_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes
create index if not exists social_service_orders_user_id_idx
  on public.social_service_orders(user_id);
create index if not exists social_service_orders_status_idx
  on public.social_service_orders(status);
create index if not exists social_service_orders_created_at_idx
  on public.social_service_orders(created_at desc);

-- Updated_at trigger
create or replace function public.set_social_service_orders_updated_at()
returns trigger language plpgsql as 
begin new.updated_at = now(); return new; end; ;

drop trigger if exists trg_social_service_orders_updated_at on public.social_service_orders;
create trigger trg_social_service_orders_updated_at
  before update on public.social_service_orders
  for each row execute function public.set_social_service_orders_updated_at();

-- RLS
alter table public.social_service_orders enable row level security;

-- Users: insert their own orders, read their own orders
create policy "users_insert_own_orders" on public.social_service_orders
  for insert with check (auth.uid() = user_id);

create policy "users_read_own_orders" on public.social_service_orders
  for select using (auth.uid() = user_id);

-- Admins: full access
create policy "admins_full_access_social_orders" on public.social_service_orders
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );