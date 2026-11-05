CREATE OR REPLACE FUNCTION public.record_verified_marketplace_purchase(
  _buyer_id uuid,
  _producer_id uuid,
  _beat_id uuid,
  _beat_title text,
  _license_type text,
  _license_name text,
  _contract_snapshot text,
  _gross_amount numeric,
  _platform_commission numeric,
  _producer_earnings numeric,
  _provider_reference text
)
RETURNS public.purchases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _purchase public.purchases%ROWTYPE;
  _inserted boolean := false;
BEGIN
  INSERT INTO public.purchases (
    buyer_id, producer_id, beat_id, beat_title, license_type, license_name,
    contract_snapshot, gross_amount, platform_commission, producer_earnings,
    provider_fee, net_amount, currency, payment_status, payout_mode,
    payment_provider, provider_reference, download_status
  )
  VALUES (
    _buyer_id, _producer_id, _beat_id, _beat_title, _license_type, _license_name,
    _contract_snapshot, _gross_amount, _platform_commission, _producer_earnings,
    0, _gross_amount, 'NGN', 'paid', 'wallet', 'paystack',
    _provider_reference, 'unlocked'
  )
  ON CONFLICT (payment_provider, provider_reference)
    WHERE provider_reference IS NOT NULL
  DO NOTHING
  RETURNING * INTO _purchase;

  _inserted := FOUND;

  IF NOT _inserted THEN
    SELECT * INTO _purchase
    FROM public.purchases
    WHERE payment_provider = 'paystack'
      AND provider_reference = _provider_reference;
  ELSE
    INSERT INTO public.producer_wallets (producer_id)
    VALUES (_producer_id)
    ON CONFLICT (producer_id) DO NOTHING;

    UPDATE public.producer_wallets
    SET available_balance = available_balance + _producer_earnings,
        lifetime_earnings = lifetime_earnings + _producer_earnings,
        sales_count = sales_count + 1,
        updated_at = now()
    WHERE producer_id = _producer_id;
  END IF;

  RETURN _purchase;
END;
$$;

REVOKE ALL ON FUNCTION public.record_verified_marketplace_purchase(uuid, uuid, uuid, text, text, text, text, numeric, numeric, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_marketplace_purchase(uuid, uuid, uuid, text, text, text, text, numeric, numeric, numeric, text) TO service_role;