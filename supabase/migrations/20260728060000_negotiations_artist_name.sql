-- Add artist_name and artist_email columns to negotiations table
-- so producers can see who sent an offer without needing a profiles join.
alter table public.negotiations
  add column if not exists artist_name text not null default '',
  add column if not exists artist_email text not null default '';
