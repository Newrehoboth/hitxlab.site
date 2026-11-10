DO $$
DECLARE
  _buyer_id uuid;
  _producer_id uuid;
  _purchase_id uuid;
  _beat_id uuid := 'fbc5c188-9b7d-4a70-af5b-17124bd39935';
BEGIN
  SELECT id INTO _buyer_id FROM auth.users WHERE email = 'poshpappy1@gmail.com' LIMIT 1;
  IF _buyer_id IS NULL THEN RAISE EXCEPTION 'Buyer not found: poshpappy1@gmail.com'; END IF;

  SELECT producer_id INTO _producer_id FROM beats WHERE id = _beat_id LIMIT 1;
  IF _producer_id IS NULL THEN RAISE EXCEPTION 'Beat not found'; END IF;

  IF EXISTS (SELECT 1 FROM purchases WHERE buyer_id = _buyer_id AND beat_id = _beat_id) THEN
    RAISE NOTICE 'Already exists - artist should log out and back in to see it';
    RETURN;
  END IF;

  INSERT INTO purchases (
    buyer_id, producer_id, beat_id, beat_title,
    license_type, license_name,
    gross_amount, platform_commission, producer_earnings,
    payment_status, payment_provider, provider_reference,
    invoice_number, purchase_date, created_at
  ) VALUES (
    _buyer_id, _producer_id, _beat_id, 'FANTA',
    'unlimited', 'Unlimited License',
    120000.00, 12000.00, 108000.00,
    'paid', 'paystack', 'oct_l79377807688B_4wthrud',
    'INV-20251104-FANTA',
    '2025-11-04 07:45:00+00', '2025-11-04 07:45:00+00'
  ) RETURNING id INTO _purchase_id;

  RAISE NOTICE '✅ DONE! Purchase ID: %', _purchase_id;
  RAISE NOTICE 'Artist can now see FANTA in their library with MP3 + WAV + STEMS downloads';
END $$;
