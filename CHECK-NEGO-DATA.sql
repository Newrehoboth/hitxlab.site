-- Check what negotiations exist in database

-- 1. Show all negotiations
SELECT 
  n.id,
  n.beat_id,
  n.beat_title,
  n.producer_id,
  n.artist_id,
  n.offer_amount,
  n.status,
  n.created_at,
  p_artist.name as artist_name,
  p_artist.email as artist_email,
  p_producer.name as producer_name,
  p_producer.email as producer_email
FROM public.negotiations n
LEFT JOIN profiles p_artist ON p_artist.id = n.artist_id
LEFT JOIN profiles p_producer ON p_producer.id = n.producer_id
ORDER BY n.created_at DESC
LIMIT 10;

-- 2. Show messages for each negotiation
SELECT 
  nm.negotiation_id,
  n.beat_title,
  nm.sender_role,
  nm.body,
  nm.created_at,
  p.name as sender_name
FROM public.negotiation_messages nm
JOIN public.negotiations n ON n.id = nm.negotiation_id
LEFT JOIN profiles p ON p.id = nm.sender_id
ORDER BY nm.created_at DESC
LIMIT 20;

-- 3. Count negotiations per producer
SELECT 
  p.name as producer_name,
  p.email as producer_email,
  COUNT(n.id) as negotiation_count
FROM profiles p
LEFT JOIN public.negotiations n ON n.producer_id = p.id
WHERE p.account_type = 'producer'
GROUP BY p.id, p.name, p.email
ORDER BY negotiation_count DESC;
