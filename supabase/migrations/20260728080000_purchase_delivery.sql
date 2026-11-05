-- ────────────────────────────────────────────────────────────────
-- Beat Purchase & Delivery Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ────────────────────────────────────────────────────────────────

-- 1. purchases table (main purchase record)
create table if not exists public.purchases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  producer_id     uuid,
  beat_id         text not null,
  license_id      text not null,
  license_name    text not null,
  payment_id      text,
  amount          numeric(12,2) not null,
  status          text not null default 'pending',  -- pending | completed | refunded
  purchase_date   timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- 2. purchase_items table (per-beat detail in a purchase)
create table if not exists public.purchase_items (
  id                  uuid primary key default gen_random_uuid(),
  purchase_id         uuid not null references public.purchases(id) on delete cascade,
  beat_id             text not null,
  beat_title          text not null,
  producer_id         uuid,
  producer_name       text,
  license_type        text not null,
  license_name        text not null,
  price               numeric(12,2) not null,
  contract_snapshot   text,
  created_at          timestamptz not null default now()
);

-- 3. download_logs table (tracks every download for audit / DRM)
create table if not exists public.download_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  purchase_id   uuid references public.purchases(id) on delete set null,
  beat_id       text,
  asset_type    text,             -- mp3 | wav | stems | pdf
  ip_address    text,
  downloaded_at timestamptz not null default now()
);

-- 4. Row-level security
alter table public.purchases    enable row level security;
alter table public.purchase_items enable row level security;
alter table public.download_logs  enable row level security;

-- Buyers can only see their own purchases
create policy "buyers_own_purchases" on public.purchases
  for select using (auth.uid() = user_id);

create policy "buyers_insert_purchases" on public.purchases
  for insert with check (auth.uid() = user_id);

-- Buyers can see their own purchase items
create policy "buyers_own_purchase_items" on public.purchase_items
  for select using (
    purchase_id in (
      select id from public.purchases where user_id = auth.uid()
    )
  );

create policy "buyers_insert_purchase_items" on public.purchase_items
  for insert with check (
    purchase_id in (
      select id from public.purchases where user_id = auth.uid()
    )
  );

-- Only the user can see their download logs
create policy "users_own_download_logs" on public.download_logs
  for select using (auth.uid() = user_id);

create policy "users_insert_download_logs" on public.download_logs
  for insert with check (auth.uid() = user_id);

-- 5. Producers can see purchases of their beats
create policy "producers_see_their_beat_purchases" on public.purchases
  for select using (auth.uid() = producer_id);

create policy "producers_see_their_beat_purchase_items" on public.purchase_items
  for select using (auth.uid() = producer_id);

-- ────────────────────────────────────────────────────────────────
-- Verification query — run after migration to confirm tables exist
-- ────────────────────────────────────────────────────────────────
-- select table_name from information_schema.tables
-- where table_schema = 'public'
-- and table_name in ('purchases', 'purchase_items', 'download_logs');
