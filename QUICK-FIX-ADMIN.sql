-- ═══════════════════════════════════════════════════════════════════════════
-- QUICK FIX FOR ADMIN ACCESS
-- Copy and paste this ENTIRE script into Supabase SQL Editor and click RUN
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SIMPLE ADMIN FIX - Just Grant The Role
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'hixlabadmin@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

SELECT '✅ DONE! Refresh your admin dashboard now.' AS result;
