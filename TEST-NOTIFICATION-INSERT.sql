-- Test if we can insert a notification directly
-- Replace 'YOUR_USER_ID' with your actual producer user ID

-- First, let's see what your user ID is
SELECT id, email, name FROM auth.users WHERE email LIKE '%your-email%' LIMIT 5;

-- Test inserting a notification (replace the user_id with your actual ID)
-- Example:
-- INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
-- VALUES (
--   'YOUR_USER_ID_HERE',
--   '🧪 Test Notification',
--   'This is a test notification from admin',
--   'moderation',
--   '/producer/dashboard',
--   false
-- );

-- Check if service role can insert
SELECT 
  current_setting('role') as current_role,
  has_table_privilege('service_role', 'notifications', 'INSERT') as can_insert;

-- Check RLS policies on notifications
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'notifications';
