# ⚠️ URGENT: RUN THIS SQL MIGRATION FIRST

Before the analytics will work properly, you MUST run the database migration to create the `beat_plays_log` table.

## Quick Steps:

### 1. Go to Supabase Dashboard
https://jcnritxaulgwdeardfss.supabase.co

### 2. Click "SQL Editor" (left sidebar)

### 3. Copy & Paste This SQL:

```sql
-- Create beat_plays_log table for daily play tracking
CREATE TABLE IF NOT EXISTS public.beat_plays_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT ON public.beat_plays_log TO anon;
GRANT SELECT, INSERT, DELETE ON public.beat_plays_log TO authenticated;
GRANT ALL ON public.beat_plays_log TO service_role;

-- Enable RLS
ALTER TABLE public.beat_plays_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can log plays" ON public.beat_plays_log 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can view plays" ON public.beat_plays_log 
  FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS beat_plays_log_beat_id_idx ON public.beat_plays_log(beat_id);
CREATE INDEX IF NOT EXISTS beat_plays_log_played_at_idx ON public.beat_plays_log(played_at DESC);
CREATE INDEX IF NOT EXISTS beat_plays_log_beat_date_idx ON public.beat_plays_log(beat_id, played_at DESC);
```

### 4. Click "RUN" or press Cmd+Enter

### 5. Verify Success
You should see: "Success. No rows returned"

---

## What This Does:
- Creates table to log every beat play with timestamp
- Enables real daily play tracking
- Powers the Analytics dashboard charts

## After Running This:
1. All beat plays will be logged to database
2. Analytics page will show REAL daily play data
3. No more fake "239 plays on July 5th" nonsense
4. Bar chart will show actual plays per day
5. You'll see which beat was most played each day

---

**DO THIS NOW before showing the client!** ⚠️

The code changes are already done, but they won't work until you create this database table.
