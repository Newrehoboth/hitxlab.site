# Fix Negotiations - Producer Not Seeing Artist Offers

## Problem
Artists can send negotiation offers and see them in their dashboard, but producers don't see these offers in their Messages tab.

## Diagnostic Steps

### Step 1: Check if Tables Exist
Run this in **Supabase SQL Editor**:
```sql
-- Check if tables exist
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'negotiations'
) as negotiations_table_exists;

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'negotiation_messages'
) as messages_table_exists;
```

**Expected Result**: Both should return `true`

**If `false`**: The migration hasn't been run. Go to Step 2.

### Step 2: Run Negotiations Migration (If Tables Don't Exist)

If tables don't exist, run this SQL:

```sql
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

-- Grant permissions
grant select, insert, update on public.negotiations to authenticated;
grant select, insert on public.negotiation_messages to authenticated;
```

### Step 3: Test Creating a New Offer

1. **Sign in as artist**
2. **Go to a beat detail page**
3. **Open browser console** (F12)
4. **Make a negotiation offer** on a negotiable license
5. **Watch console for 🔍 messages**:
   ```
   🔍 Artist creating negotiation for beat: [beat-id]
   🔍 Producer ID: [producer-uuid]
   🔍 Artist ID: [artist-uuid]
   🔍 Negotiation created: { id: ..., beat_title: ..., ... }
   🔍 Negotiation error: null
   🔍 Message created: ...
   🔍 Message error: null
   ```

6. **If you see errors**, send me the error details

### Step 4: Check Producer Dashboard

1. **Sign out from artist account**
2. **Sign in as producer** (the one who owns the beat)
3. **Go to producer dashboard → Messages tab**
4. **Open browser console** (F12)
5. **Watch for 🔍 messages**:
   ```
   🔍 Producer loading negotiations for userId: [producer-uuid]
   🔍 Negotiations from DB: [array of negotiations]
   🔍 DB Error: null
   🔍 Total negotiations (DB + localStorage): 1
   🔍 Combined negotiations: [...]
   ```

6. **Expected**: Producer should see the offer!

### Step 5: Check Database Directly

Run this SQL to see all negotiations:

```sql
SELECT 
  n.id,
  n.beat_title,
  n.offer_amount,
  n.status,
  n.license_name,
  n.created_at,
  artist.name as artist_name,
  artist.email as artist_email,
  producer.name as producer_name,
  producer.email as producer_email
FROM public.negotiations n
LEFT JOIN profiles artist ON artist.id = n.artist_id
LEFT JOIN profiles producer ON producer.id = n.producer_id
ORDER BY n.created_at DESC;
```

This will show you all negotiations with artist and producer names.

## Common Issues and Solutions

### Issue 1: Tables Don't Exist
**Solution**: Run the migration SQL from Step 2

### Issue 2: RLS Policies Blocking Access
**Symptom**: `negotiations_from_db` is empty even though data exists in database
**Solution**: Check if RLS policies exist:
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('negotiations', 'negotiation_messages');
```
Should show 5 policies. If not, rerun the migration SQL.

### Issue 3: Producer ID Not Found
**Symptom**: Console shows "Producer ID: null" or "Producer ID: undefined"
**Cause**: The beat doesn't have a proper producer_id
**Solution**: Check the beats table:
```sql
SELECT id, title, producer_id FROM beats WHERE id = 'your-beat-id';
```
Make sure producer_id is set correctly.

### Issue 4: Data Only in localStorage
**Symptom**: Artist sees offers in their dashboard, but they're not in the database
**Cause**: Supabase insert failed silently
**Solution**: Check console for error messages when creating the offer

## Testing Checklist

- [ ] Run CHECK-NEGOTIATIONS.sql to verify tables exist
- [ ] Create a new offer as artist
- [ ] Check console for negotiation creation logs
- [ ] Verify data appears in database (run Step 5 SQL)
- [ ] Sign in as producer
- [ ] Go to Messages tab
- [ ] Check console for negotiation loading logs
- [ ] Verify offer appears in producer's Messages tab
- [ ] Try replying as producer
- [ ] Check if reply shows up for artist

## Files Modified

Added debug logging to:
- `/src/routes/beat.$id.tsx` - Artist offer creation
- `/src/routes/producer/dashboard.tsx` - Producer loading negotiations

## What to Send Me If Still Broken

1. **Screenshot of console** when artist creates offer (🔍 messages)
2. **Screenshot of console** when producer loads Messages tab (🔍 messages)
3. **Result of Step 5 SQL query** (all negotiations in database)
4. **Any error messages** from console or Supabase

This will help me pinpoint exactly where the issue is!
