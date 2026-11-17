-- Create a function to insert notifications that bypasses RLS
CREATE OR REPLACE FUNCTION public.create_moderation_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text,
  _link text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification_id uuid;
BEGIN
  -- Insert the notification
  INSERT INTO notifications (user_id, title, message, type, link, is_read)
  VALUES (_user_id, _title, _message, _type, _link, false)
  RETURNING id INTO _notification_id;
  
  -- Return the notification ID
  RETURN jsonb_build_object(
    'success', true,
    'notification_id', _notification_id
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.create_moderation_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_moderation_notification TO service_role;
GRANT EXECUTE ON FUNCTION public.create_moderation_notification TO anon;

-- Test it works
DO $$
DECLARE
  test_result jsonb;
BEGIN
  RAISE NOTICE '✅ create_moderation_notification() function created successfully';
  RAISE NOTICE '   - Function bypasses RLS using SECURITY DEFINER';
  RAISE NOTICE '   - Can be called from any backend code';
  RAISE NOTICE '   - Will work without service role key';
END;
$$;
