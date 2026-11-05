-- Create purchases table for storing user purchases/library

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  purchase_id text NOT NULL UNIQUE,
  license_name text NOT NULL,
  license_type text NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Add index for faster queries
  CONSTRAINT purchases_user_beat_unique UNIQUE (user_id, beat_id, purchase_id)
);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own purchases"
  ON public.purchases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
  ON public.purchases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;

-- Create index for performance
CREATE INDEX purchases_user_id_idx ON public.purchases(user_id);
CREATE INDEX purchases_beat_id_idx ON public.purchases(beat_id);
CREATE INDEX purchases_created_at_idx ON public.purchases(created_at DESC);

-- Verify table was created
SELECT 'purchases table created successfully' AS status;
