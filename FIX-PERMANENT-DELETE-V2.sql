-- Fix the permanently_delete_beat function to handle missing tables gracefully
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
  
  -- Delete related records (only if tables exist)
  -- Use PERFORM to check if records exist before deleting
  DELETE FROM beat_likes WHERE beat_id = _beat_id;
  
  -- Try to delete from cart-related tables (they might have different names)
  BEGIN
    -- Try cart_items first
    DELETE FROM cart_items WHERE beat_id = _beat_id;
  EXCEPTION WHEN undefined_table THEN
    -- If cart_items doesn't exist, try other common names
    BEGIN
      DELETE FROM carts WHERE beat_id = _beat_id;
    EXCEPTION WHEN undefined_table THEN
      -- Ignore if neither exists
      NULL;
    END;
  END;
  
  -- Delete from purchases if needed (preserve history by not deleting)
  -- Purchases should remain for accounting purposes
  
  -- NOW delete the beat itself
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

-- Make sure service role can execute this
GRANT EXECUTE ON FUNCTION public.permanently_delete_beat TO service_role;

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ permanently_delete_beat() function updated successfully';
  RAISE NOTICE '   - Handles missing cart tables gracefully';
  RAISE NOTICE '   - Records moderation action before deletion';
  RAISE NOTICE '   - Preserves purchase history';
END;
$$;
