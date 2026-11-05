-- ROLES
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PURCHASES
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  beat_title text NOT NULL DEFAULT '',
  license_type text NOT NULL,
  license_name text NOT NULL,
  contract_snapshot text NOT NULL DEFAULT '',
  gross_amount numeric(14,2) NOT NULL,
  platform_commission numeric(14,2) NOT NULL,
  producer_earnings numeric(14,2) NOT NULL,
  provider_fee numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  payment_status text NOT NULL DEFAULT 'pending',
  payout_mode text NOT NULL DEFAULT 'wallet',
  payment_provider text NOT NULL DEFAULT 'internal',
  provider_reference text,
  download_status text NOT NULL DEFAULT 'locked',
  invoice_number text NOT NULL DEFAULT ('INV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_provider, provider_reference)
);
GRANT SELECT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyers read own purchases" ON public.purchases FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "producers read own sales" ON public.purchases FOR SELECT TO authenticated USING (auth.uid() = producer_id);
CREATE POLICY "admins read all purchases" ON public.purchases FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS purchases_buyer_idx ON public.purchases(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS purchases_producer_idx ON public.purchases(producer_id, created_at DESC);

-- WALLETS
CREATE TABLE IF NOT EXISTS public.producer_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance numeric(14,2) NOT NULL DEFAULT 0,
  pending_balance numeric(14,2) NOT NULL DEFAULT 0,
  lifetime_earnings numeric(14,2) NOT NULL DEFAULT 0,
  total_withdrawn numeric(14,2) NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.producer_wallets TO authenticated;
GRANT ALL ON public.producer_wallets TO service_role;
ALTER TABLE public.producer_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "producers read own wallet" ON public.producer_wallets FOR SELECT TO authenticated USING (auth.uid() = producer_id OR public.has_role(auth.uid(),'admin'));

-- PAYOUT ACCOUNTS
CREATE TABLE IF NOT EXISTS public.payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payout_accounts TO authenticated;
GRANT ALL ON public.payout_accounts TO service_role;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "producers read own payout account" ON public.payout_accounts FOR SELECT TO authenticated USING (auth.uid() = producer_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "producers insert own payout account" ON public.payout_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = producer_id);
CREATE POLICY "producers update own payout account" ON public.payout_accounts FOR UPDATE TO authenticated USING (auth.uid() = producer_id) WITH CHECK (auth.uid() = producer_id);

-- WITHDRAWALS
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'NGN',
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "producers read own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = producer_id OR public.has_role(auth.uid(),'admin'));

-- PAYMENT EVENT LOG (idempotency)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  reference text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read payment events" ON public.payment_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- updated_at triggers
CREATE TRIGGER purchases_set_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER wallets_set_updated_at BEFORE UPDATE ON public.producer_wallets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER payout_accounts_set_updated_at BEFORE UPDATE ON public.payout_accounts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER withdrawals_set_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();