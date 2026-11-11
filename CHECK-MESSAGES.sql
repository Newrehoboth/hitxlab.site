-- Run this in Lovable SQL Editor to see if messages exist

-- Check if any messages exist in the table
SELECT 
  dm.id,
  dm.sender_id,
  dm.receiver_id,
  dm.message,
  dm.read,
  dm.created_at,
  sender.name as sender_name,
  sender.email as sender_email,
  receiver.name as receiver_name,
  receiver.email as receiver_email
FROM direct_messages dm
LEFT JOIN profiles sender ON dm.sender_id = sender.id
LEFT JOIN profiles receiver ON dm.receiver_id = receiver.id
ORDER BY dm.created_at DESC
LIMIT 20;

-- If this returns "No rows", then no messages have been sent yet
-- If it returns data, copy the results and show me
