-- Negotiations table: artist makes an offer on a beat, producer can reply
create table if not exists public.negotiations (
  id uuid primary key default gen_random_uuid(),
  beat_id text not null,
  beat_title text not null,
  producer_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null references auth.users(id) on delete cascade,
  license_name text not null,
  offer_amount numeric not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','countered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages inside each negotiation thread
create table if not exists public.negotiation_messages (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.negotiations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('artist','producer')),
  body text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.negotiations enable row level security;
alter table public.negotiation_messages enable row level security;

-- RLS Policies: negotiations visible to the artist or producer of that negotiation
create policy "negotiations_select" on public.negotiations
  for select using (
    auth.uid() = artist_id or auth.uid() = producer_id
  );

create policy "negotiations_insert" on public.negotiations
  for insert with check (
    auth.uid() = artist_id
  );

create policy "negotiations_update" on public.negotiations
  for update using (
    auth.uid() = artist_id or auth.uid() = producer_id
  );

-- negotiation_messages visible if you're part of the negotiation
create policy "negmsg_select" on public.negotiation_messages
  for select using (
    exists (
      select 1 from public.negotiations n
      where n.id = negotiation_id
        and (n.artist_id = auth.uid() or n.producer_id = auth.uid())
    )
  );

create policy "negmsg_insert" on public.negotiation_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.negotiations n
      where n.id = negotiation_id
        and (n.artist_id = auth.uid() or n.producer_id = auth.uid())
    )
  );

-- updated_at trigger for negotiations
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists negotiations_updated_at on public.negotiations;
create trigger negotiations_updated_at
  before update on public.negotiations
  for each row execute function public.set_updated_at();
