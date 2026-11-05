-- Academy Applications Table
-- Stores applicants who fill out the pre-payment form for Hitxlab Academy

create table if not exists public.academy_applications (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text not null,
  whatsapp_number text not null,
  address     text not null,
  amount      numeric(12,2) not null default 850000,
  payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Paid')),
  reference   text,
  created_at  timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.academy_applications enable row level security;

-- Only service_role (admin) can read/write — no public access
-- The app uses supabaseAdmin (service role key) server-side, so no policy needed for normal reads.
-- If you ever need authenticated reads, add a policy here.

-- Index for quick lookup by email
create index if not exists academy_applications_email_idx on public.academy_applications (email);
create index if not exists academy_applications_created_at_idx on public.academy_applications (created_at desc);
