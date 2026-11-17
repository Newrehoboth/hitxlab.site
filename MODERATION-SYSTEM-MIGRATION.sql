-- ═══════════════════════════════════════════════════════════════════════════
-- HITXLAB CONTENT MODERATION SYSTEM
-- Features: Beat Takedowns, User Strikes, Email Notifications
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. BEAT MODERATION TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.beat_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id UUID NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('takedown_temporary', 'takedown_permanent', 'restore', 'warning')),
  reason TEXT NOT NULL CHECK (reason IN (
    'copyright_claim',
    'uploaded_music_not_beat',
    'inappropriate_content',
    'spam',
    'terms_violation',
    'other'
  )),
  custom_reason TEXT,
  admin_notes TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- For temporary takedowns
  restored_at TIMESTAMPTZ
);

CREATE INDEX idx_beat_moderation_beat_id ON public.beat_moderation_actions(beat_id);
CREATE INDEX idx_beat_moderation_producer_id ON public.beat_moderation_actions(producer_id);
CREATE INDEX idx_beat_moderation_action_type ON public.beat_moderation_actions(action_type);

-- Add moderation status to beats table
ALTER TABLE public.beats
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'active' 
  CHECK (moderation_status IN ('active', 'under_review', 'taken_down_temporary', 'taken_down_permanent'));

ALTER TABLE public.beats
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

ALTER TABLE public.beats
ADD COLUMN IF NOT EXISTS taken_down_at TIMESTAMPTZ;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. USER STRIKES TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  strike_type TEXT NOT NULL CHECK (strike_type IN ('warning', 'violation', 'severe_violation')),
  reason TEXT NOT NULL CHECK (reason IN (
    'copyright_violation',
    'uploaded_music_instead_of_beat',
    'inappropriate_content',
    'spam',
    'terms_violation',
    'multiple_violations',
    'other'
  )),
  custom_reason TEXT,
  admin_notes TEXT,
  related_beat_id UUID REFERENCES public.beats(id) ON DELETE SET NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Strikes can expire after X months
);

CREATE INDEX idx_user_strikes_user_id ON public.user_strikes(user_id);
CREATE INDEX idx_user_strikes_created_at ON public.user_strikes(created_at DESC);

-- Add strike count to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_strikes INTEGER DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS active_strikes INTEGER DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. MODERATION ACTIVITY LOG
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.moderation_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('beat', 'user', 'purchase', 'other')),
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_moderation_log_admin_id ON public.moderation_activity_log(admin_id);
CREATE INDEX idx_moderation_log_created_at ON public.moderation_activity_log(created_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. RLS POLICIES
-- ───────────────────────────────────────────────────────────────────────────

-- Beat Moderation Actions
ALTER TABLE public.beat_moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage moderation actions"
  ON public.beat_moderation_actions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their own moderation history"
  ON public.beat_moderation_actions FOR SELECT
  TO authenticated
  USING (producer_id = auth.uid());

-- User Strikes
ALTER TABLE public.user_strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage strikes"
  ON public.user_strikes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their own strikes"
  ON public.user_strikes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Moderation Activity Log
ALTER TABLE public.moderation_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity log"
  ON public.moderation_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ───────────────────────────────────────────────────────────────────────────
-- 5. FUNCTIONS
-- ───────────────────────────────────────────────────────────────────────────

-- Function: Take down a beat
CREATE OR REPLACE FUNCTION public.takedown_beat(
  _beat_id UUID,
  _admin_id UUID,
  _action_type TEXT,
  _reason TEXT,
  _custom_reason TEXT DEFAULT NULL,
  _admin_notes TEXT DEFAULT NULL,
  _expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _producer_id UUID;
  _beat_title TEXT;
  _action_id UUID;
  _moderation_status TEXT;
BEGIN
  -- Get beat info
  SELECT producer_id, title INTO _producer_id, _beat_title
  FROM public.beats
  WHERE id = _beat_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Beat not found';
  END IF;

  -- Determine moderation status
  IF _action_type = 'takedown_temporary' THEN
    _moderation_status := 'taken_down_temporary';
  ELSIF _action_type = 'takedown_permanent' THEN
    _moderation_status := 'taken_down_permanent';
  ELSIF _action_type = 'restore' THEN
    _moderation_status := 'active';
  ELSE
    _moderation_status := 'under_review';
  END IF;

  -- Update beat status
  UPDATE public.beats
  SET 
    moderation_status = _moderation_status,
    moderation_reason = _reason,
    taken_down_at = CASE WHEN _action_type IN ('takedown_temporary', 'takedown_permanent') THEN NOW() ELSE NULL END,
    published = CASE WHEN _action_type IN ('takedown_temporary', 'takedown_permanent') THEN false ELSE published END,
    updated_at = NOW()
  WHERE id = _beat_id;

  -- Record moderation action
  INSERT INTO public.beat_moderation_actions (
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
    _action_type,
    _reason,
    _custom_reason,
    _admin_notes,
    _expires_at
  ) RETURNING id INTO _action_id;

  -- Log activity
  INSERT INTO public.moderation_activity_log (admin_id, action, target_type, target_id, details)
  VALUES (
    _admin_id,
    'beat_' || _action_type,
    'beat',
    _beat_id,
    jsonb_build_object(
      'beat_title', _beat_title,
      'producer_id', _producer_id,
      'reason', _reason,
      'custom_reason', _custom_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'action_id', _action_id,
    'beat_id', _beat_id,
    'producer_id', _producer_id,
    'beat_title', _beat_title,
    'action_type', _action_type,
    'reason', _reason,
    'custom_reason', _custom_reason
  );
END;
$$;

-- Function: Give user a strike
CREATE OR REPLACE FUNCTION public.give_user_strike(
  _user_id UUID,
  _admin_id UUID,
  _strike_type TEXT,
  _reason TEXT,
  _custom_reason TEXT DEFAULT NULL,
  _admin_notes TEXT DEFAULT NULL,
  _related_beat_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _strike_id UUID;
  _user_email TEXT;
  _user_name TEXT;
  _current_strikes INTEGER;
  _should_suspend BOOLEAN := false;
BEGIN
  -- Get user info
  SELECT email, name INTO _user_email, _user_name
  FROM public.profiles
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Insert strike
  INSERT INTO public.user_strikes (
    user_id,
    admin_id,
    strike_type,
    reason,
    custom_reason,
    admin_notes,
    related_beat_id
  ) VALUES (
    _user_id,
    _admin_id,
    _strike_type,
    _reason,
    _custom_reason,
    _admin_notes,
    _related_beat_id
  ) RETURNING id INTO _strike_id;

  -- Count active strikes (not expired)
  SELECT COUNT(*) INTO _current_strikes
  FROM public.user_strikes
  WHERE user_id = _user_id
    AND (expires_at IS NULL OR expires_at > NOW());

  -- Update profile strike count
  UPDATE public.profiles
  SET 
    total_strikes = total_strikes + 1,
    active_strikes = _current_strikes,
    updated_at = NOW()
  WHERE id = _user_id;

  -- Auto-suspend if 2+ strikes
  IF _current_strikes >= 2 THEN
    _should_suspend := true;
    
    UPDATE public.profiles
    SET 
      is_suspended = true,
      suspended_at = NOW(),
      suspension_reason = 'Multiple strikes (auto-suspended)',
      updated_at = NOW()
    WHERE id = _user_id;
  END IF;

  -- Log activity
  INSERT INTO public.moderation_activity_log (admin_id, action, target_type, target_id, details)
  VALUES (
    _admin_id,
    'user_strike_' || _strike_type,
    'user',
    _user_id,
    jsonb_build_object(
      'user_email', _user_email,
      'reason', _reason,
      'custom_reason', _custom_reason,
      'total_strikes', _current_strikes,
      'auto_suspended', _should_suspend
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'strike_id', _strike_id,
    'user_id', _user_id,
    'user_email', _user_email,
    'user_name', _user_name,
    'total_strikes', _current_strikes,
    'suspended', _should_suspend,
    'reason', _reason,
    'custom_reason', _custom_reason
  );
END;
$$;

-- Function: Get user's moderation history
CREATE OR REPLACE FUNCTION public.get_user_moderation_summary(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _strikes INTEGER;
  _takedowns INTEGER;
  _is_suspended BOOLEAN;
  _result JSONB;
BEGIN
  SELECT active_strikes, is_suspended INTO _strikes, _is_suspended
  FROM public.profiles
  WHERE id = _user_id;

  SELECT COUNT(*) INTO _takedowns
  FROM public.beat_moderation_actions
  WHERE producer_id = _user_id
    AND action_type IN ('takedown_temporary', 'takedown_permanent');

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'active_strikes', COALESCE(_strikes, 0),
    'total_takedowns', COALESCE(_takedowns, 0),
    'is_suspended', COALESCE(_is_suspended, false)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.takedown_beat(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.give_user_strike(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_moderation_summary(UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.beat_moderation_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_strikes TO authenticated;
GRANT SELECT, INSERT ON public.moderation_activity_log TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Now run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

SELECT '✅ Moderation system created successfully!' AS result;
