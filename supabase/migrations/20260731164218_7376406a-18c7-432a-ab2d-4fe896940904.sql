CREATE OR REPLACE FUNCTION public.credit_producer_wallet(_producer_id uuid, _amount numeric, _pending boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.producer_wallets (producer_id) VALUES (_producer_id)
  ON CONFLICT (producer_id) DO NOTHING;

  UPDATE public.producer_wallets
     SET available_balance = available_balance + CASE WHEN _pending THEN 0 ELSE _amount END,
         pending_balance   = pending_balance   + CASE WHEN _pending THEN _amount ELSE 0 END,
         lifetime_earnings = lifetime_earnings + _amount,
         sales_count       = sales_count + 1,
         updated_at = now()
   WHERE producer_id = _producer_id;
END; $$;
REVOKE ALL ON FUNCTION public.credit_producer_wallet(uuid, numeric, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_producer_wallet(uuid, numeric, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_producer_id uuid, _amount numeric, _reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _acct public.payout_accounts%ROWTYPE; _id uuid; _updated int;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT * INTO _acct FROM public.payout_accounts WHERE producer_id = _producer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No payout account on file'; END IF;

  UPDATE public.producer_wallets
     SET available_balance = available_balance - _amount, updated_at = now()
   WHERE producer_id = _producer_id AND available_balance >= _amount;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  IF _updated = 0 THEN RAISE EXCEPTION 'Insufficient available balance'; END IF;

  INSERT INTO public.withdrawals (producer_id, amount, bank_name, account_number, account_name, reference)
  VALUES (_producer_id, _amount, _acct.bank_name, _acct.account_number, _acct.account_name, _reference)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public.request_withdrawal(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, text) TO service_role;

CREATE OR REPLACE FUNCTION public.settle_withdrawal(_withdrawal_id uuid, _status text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w public.withdrawals%ROWTYPE;
BEGIN
  SELECT * INTO _w FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF _w.status IN ('paid','reversed') THEN RAISE EXCEPTION 'Withdrawal already settled'; END IF;
  IF _status NOT IN ('pending','processing','paid','failed','reversed') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  IF _status = 'paid' THEN
    UPDATE public.producer_wallets SET total_withdrawn = total_withdrawn + _w.amount, updated_at = now()
     WHERE producer_id = _w.producer_id;
    UPDATE public.withdrawals SET status = 'paid', paid_at = now(), admin_note = COALESCE(_note, admin_note) WHERE id = _withdrawal_id;
  ELSIF _status IN ('failed','reversed') THEN
    UPDATE public.producer_wallets SET available_balance = available_balance + _w.amount, updated_at = now()
     WHERE producer_id = _w.producer_id;
    UPDATE public.withdrawals SET status = _status, admin_note = COALESCE(_note, admin_note) WHERE id = _withdrawal_id;
  ELSE
    UPDATE public.withdrawals SET status = _status, admin_note = COALESCE(_note, admin_note) WHERE id = _withdrawal_id;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.settle_withdrawal(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_withdrawal(uuid, text, text) TO service_role;