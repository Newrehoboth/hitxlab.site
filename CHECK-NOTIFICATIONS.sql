-- Check if any notifications exist in the database
SELECT 
  n.id,
  n.user_id,
  n.title,
  n.message,
  n.type,
  n.is_read,
  n.created_at,
  p.email,
  p.name
FROM notifications n
LEFT JOIN profiles p ON p.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 20;

-- Check if there are ANY notifications at all
SELECT COUNT(*) as total_notifications FROM notifications;

-- Check moderation actions to see if they were recorded
SELECT 
  bma.id,
  bma.beat_id,
  bma.action_type,
  bma.reason,
  bma.created_at,
  p.email as producer_email,
  p.name as producer_name
FROM beat_moderation_actions bma
LEFT JOIN profiles p ON p.id = bma.producer_id
ORDER BY bma.created_at DESC
LIMIT 10;
