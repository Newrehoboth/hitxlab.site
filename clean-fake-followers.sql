-- Clean up any fake follower data from producer_followers table
-- Only run this if you want to reset all follower data to 0

-- Check current followers
SELECT 
  pf.*,
  pp.producer_name as producer_name,
  p.name as follower_name
FROM producer_followers pf
LEFT JOIN producer_profiles pp ON pf.producer_id = pp.user_id
LEFT JOIN profiles p ON pf.follower_id = p.id
ORDER BY pf.created_at DESC;

-- Delete all fake followers (UNCOMMENT TO RUN)
-- DELETE FROM producer_followers;

-- After running this, follower counts should be 0 everywhere
-- Users will need to click the "Follow" button to become followers again
