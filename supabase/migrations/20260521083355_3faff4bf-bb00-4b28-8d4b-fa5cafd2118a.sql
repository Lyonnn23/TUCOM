-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'empresa')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'pending')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  canceled_at timestamptz,
  provider text,
  external_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins manage subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Route search log for monthly usage counting
CREATE TABLE public.route_search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  searched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.route_search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own route searches"
  ON public.route_search_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users insert own route searches"
  ON public.route_search_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_route_search_logs_user_month
  ON public.route_search_logs(user_id, searched_at);

-- Helper: is the user on an active Pro plan?
CREATE OR REPLACE FUNCTION public.has_pro_plan(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND plan = 'pro'
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Helper: count route searches for the current month
CREATE OR REPLACE FUNCTION public.count_user_route_searches_this_month(_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.route_search_logs
  WHERE user_id = _user_id
    AND searched_at >= date_trunc('month', now());
$$;