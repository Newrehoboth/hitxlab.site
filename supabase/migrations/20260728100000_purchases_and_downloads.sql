-- Purchases & Delivery System Migration

-- 1. Purchases table
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  producer_id uuid not null references auth.users(id) on delete cascade,
  beat_id text not null,
  license_id text not null default 'basic',
  license_name text not null default 'Basic License',
  payment_id text not null default '',
  amount numeric not null default 0,
  purchase_date timestamptz not null default now(),
  status text not null default 'completed' check (status in ('completed', 'pending', 'failed')),
  created_at timestamptz not null default now()
);

-- 2. Purchase items table (supports multi-item orders)
create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  beat_id text not null,
  beat_title text not null,
  producer_id uuid not null,
  producer_name text not null default 'Producer',
  license_type text not null default 'basic',
  license_name text not null default 'Basic License',
  price numeric not null default 0,
  contract_snapshot text not null default '',
  created_at timestamptz not null default now()
);

-- 3. Licenses table (definitions & tier inclusion)
create table if not exists public.licenses (
  id text primary key,
  name text not null,
  type text not null,
  included_assets jsonb not null default '["mp3"]'::jsonb,
  terms text not null default '',
  created_at timestamptz not null default now()
);

-- Seed licenses if missing
insert into public.licenses (id, name, type, included_assets, terms)
values
  ('basic', 'Basic License', 'basic', '["mp3"]'::jsonb, 'Non-exclusive distribution up to 3,000 streams. MP3 format.'),
  ('premium', 'Premium License', 'premium', '["mp3", "wav"]'::jsonb, 'Non-exclusive distribution up to 10,000 streams. MP3 + WAV format.'),
  ('unlimited', 'Unlimited License', 'unlimited', '["mp3", "wav", "stems"]'::jsonb, 'Unlimited streaming & radio distribution. MP3 + WAV + ZIP Tracked Stems.'),
  ('exclusive', 'Exclusive License', 'exclusive', '["mp3", "wav", "stems", "pdf"]'::jsonb, 'Full ownership buyout rights. MP3 + WAV + ZIP Tracked Stems + Exclusive License PDF.')
on conflict (id) do update set
  included_assets = excluded.included_assets,
  terms = excluded.terms;

-- 4. Download logs table
create table if not exists public.download_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete cascade,
  beat_id text not null,
  asset_type text not null check (asset_type in ('mp3', 'wav', 'stems', 'pdf')),
  downloaded_at timestamptz not null default now(),
  ip_address text not null default ''
);

-- Enable RLS
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.licenses enable row level security;
alter table public.download_logs enable row level security;

-- RLS Policies: purchases visible to buyer or producer
create policy "purchases_select" on public.purchases
  for select using (
    auth.uid() = user_id or auth.uid() = producer_id
  );

create policy "purchases_insert" on public.purchases
  for insert with check (
    auth.uid() = user_id
  );

-- purchase_items visible to buyer or producer of purchase
create policy "purchase_items_select" on public.purchase_items
  for select using (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_id
        and (p.user_id = auth.uid() or p.producer_id = auth.uid())
    )
  );

create policy "purchase_items_insert" on public.purchase_items
  for insert with check (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_id
        and p.user_id = auth.uid()
    )
  );

-- licenses public read
create policy "licenses_select" on public.licenses
  for select using (true);

-- download_logs visible & insertable by buyer
create policy "download_logs_select" on public.download_logs
  for select using (auth.uid() = user_id);

create policy "download_logs_insert" on public.download_logs
  for insert with check (auth.uid() = user_id);
