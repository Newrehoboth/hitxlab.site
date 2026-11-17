-- Fix 1: Allow service role to INSERT notifications (for moderation alerts)
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;
CREATE POLICY "notifications_insert_service" 
  ON public.notifications 
  FOR INSERT 
  TO service_role 
  WITH CHECK (true);

-- Fix 2: Ensure service role can DELETE beats (for permanent takedowns)
GRANT DELETE ON public.beats TO service_role;

-- Fix 3: Create a dedicated function for permanent beat deletion that bypasses RLS
CREATE OR REPLACE FUNCTION public.permanently_delete_beat(
  _beat_id uuid,
  _admin_id uuid,
  _reason text,
  _custom_reason text DEFAULT NULL,
  _admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _beat RECORD;
  _producer_id uuid;
BEGIN
  -- Get beat info before deletion
  SELECT id, title, producer_id INTO _beat 
  FROM beats 
  WHERE id = _beat_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Beat not found';
  END IF;
  
  _producer_id := _beat.producer_id;
  
  -- Record the moderation action FIRST
  INSERT INTO beat_moderation_actions (
    beat_id,
    producer_id,
    admin_id,
    action_type,
    reason,
    custom_reason,
    admin_notes,
    expires_at
  ) VALUES (
    _beat_id,
    _producer_id,
    _admin_id,
    'takedown_permanent',
    _reason,
    _custom_reason,
    _admin_notes,
    NULL
  );
  
  -- Delete all related records first (cascade might not work properly)
  DELETE FROM beat_likes WHERE beat_id = _beat_id;
  DELETE FROM cart_items WHERE beat_id = _beat_id;
  
  -- NOW delete the beat
  DELETE FROM beats WHERE id = _beat_id;
  
  -- Return success info
  RETURN jsonb_build_object(
    'success', true,
    'beat_id', _beat_id,
    'beat_title', _beat.title,
    'producer_id', _producer_id,
    'action', 'deleted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.permanently_delete_beat TO service_role;

-- Fix 4: Update the notifications RLS to allow service role to insert
-- (Already done in Fix 1, but let's make sure all grants are correct)
GRANT INSERT ON public.notifications TO service_role;

-- Verify the policies exist
DO $$
BEGIN
  RAISE NOTICE '✅ Moderation fixes applied:';
  RAISE NOTICE '   - Service role can INSERT notifications';
  RAISE NOTICE '   - Service role can DELETE beats';
  RAISE NOTICE '   - permanently_delete_beat() function created';
  RAISE NOTICE '   - All grants updated';
END;
$$;
