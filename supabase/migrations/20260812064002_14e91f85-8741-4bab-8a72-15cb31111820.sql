CREATE OR REPLACE FUNCTION public.get_subaccount_for_beat(_beat_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa.paystack_subaccount_code
  FROM public.beats b
  JOIN public.payout_accounts pa ON pa.producer_id = b.producer_id
  WHERE b.id = _beat_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_subaccount_for_beat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subaccount_for_beat(uuid) TO anon, authenticated, service_role;