-- MEPCO weekly adjustments
CREATE TABLE public.mepco_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of date NOT NULL UNIQUE,
  published_at timestamptz,
  direction text NOT NULL CHECK (direction IN ('up','down','neutral')),
  fuel_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mepco_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads mepco" ON public.mepco_adjustments FOR SELECT USING (true);
CREATE POLICY "Admins write mepco" ON public.mepco_adjustments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX idx_mepco_week ON public.mepco_adjustments(week_of DESC);

-- FX rates (USD/CLP)
CREATE TABLE public.fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL DEFAULT 'USD',
  rate_clp numeric NOT NULL,
  change_pct numeric NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads fx" ON public.fx_rates FOR SELECT USING (true);
CREATE POLICY "Admins write fx" ON public.fx_rates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX idx_fx_recorded ON public.fx_rates(currency, recorded_at DESC);

-- Commodity prices
CREATE TABLE public.commodity_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL DEFAULT 'WTI',
  price_usd numeric NOT NULL,
  change_pct_week numeric NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commodity_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads commodity" ON public.commodity_prices FOR SELECT USING (true);
CREATE POLICY "Admins write commodity" ON public.commodity_prices FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX idx_commodity_recorded ON public.commodity_prices(symbol, recorded_at DESC);

-- Cached macro explainers
CREATE TABLE public.macro_explainers (
  topic text PRIMARY KEY,
  body_es text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.macro_explainers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads explainers" ON public.macro_explainers FOR SELECT USING (true);
CREATE POLICY "Admins write explainers" ON public.macro_explainers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Notification preferences
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS mepco_alert_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fx_spike_alert_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_price_summary_enabled boolean NOT NULL DEFAULT true;

-- updated_at triggers
CREATE TRIGGER trg_mepco_updated BEFORE UPDATE ON public.mepco_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_explainers_updated BEFORE UPDATE ON public.macro_explainers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();