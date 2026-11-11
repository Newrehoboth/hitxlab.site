-- =====================================================
-- DIRECT MESSAGING SETUP
-- Run this in Lovable SQL Editor to enable messaging
-- =====================================================

-- Create direct_messages table for producer-artist messaging
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON public.direct_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can update received messages" ON public.direct_messages;

-- RLS Policies: Users can see messages they sent or received
CREATE POLICY "Users can view their own messages"
  ON public.direct_messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- Users can send messages (insert)
CREATE POLICY "Users can send messages"
  ON public.direct_messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can mark their received messages as read
CREATE POLICY "Users can update received messages"
  ON public.direct_messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;

-- Add comment
COMMENT ON TABLE public.direct_messages IS 'Direct messages between artists and producers';

-- Done!
SELECT 'Direct messaging table created successfully!' as status;
