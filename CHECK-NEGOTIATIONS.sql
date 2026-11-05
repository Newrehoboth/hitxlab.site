-- Diagnostic: Check if negotiations table exists and has data

-- Step 1: Check if the negotiations table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'negotiations'
) as negotiations_table_exists;

-- Step 2: Check if negotiation_messages table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'negotiation_messages'
) as messages_table_exists;

-- Step 3: Count all negotiations in the database
SELECT COUNT(*) as total_negotiations
FROM public.negotiations;

-- Step 4: Show all negotiations with artist and producer info
SELECT 
  n.id,
  n.beat_title,
  n.offer_amount,
  n.status,
  n.license_name,
  n.created_at,
  artist.name as artist_name,
  artist.email as artist_email,
  producer.name as producer_name,
  producer.email as producer_email
FROM public.negotiations n
LEFT JOIN profiles artist ON artist.id = n.artist_id
LEFT JOIN profiles producer ON producer.id = n.producer_id
ORDER BY n.created_at DESC;

-- Step 5: Count messages per negotiation
SELECT 
  n.id as negotiation_id,
  n.beat_title,
  COUNT(m.id) as message_count
FROM public.negotiations n
LEFT JOIN public.negotiation_messages m ON m.negotiation_id = n.id
GROUP BY n.id, n.beat_title
ORDER BY n.created_at DESC;

-- Step 6: Check RLS policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('negotiations', 'negotiation_messages');
